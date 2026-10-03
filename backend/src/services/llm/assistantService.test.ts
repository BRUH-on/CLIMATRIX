import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, RequestHandler, Response as ExpressResponse } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma/client';
import { ApiError } from '../../utils/ApiError';
import { createAssistantController } from '../../controllers/assistant.controller';
import { CompatibleChatProvider } from './compatibleChatProvider';
import { answerWithRetrievalTools } from './assistantService';
import { RETRIEVAL_TOOL_DEFINITIONS } from './retrievalToolDefinitions';
import type {
  LlmMessage,
  LlmProvider,
  LlmToolCall,
  LlmToolDefinition,
  LlmTurn,
} from './llmTypes';
import { insightsRouter } from '../../routes/insights.routes';

const industryUser = {
  id: 'industry-user',
  role: 'INDUSTRY' as const,
  industryId: 'industry-1',
};

class MockLlmProvider implements LlmProvider {
  readonly requests: Array<{ messages: LlmMessage[]; tools: readonly LlmToolDefinition[] }> = [];

  constructor(private readonly turns: Array<LlmTurn | Error>) {}

  async complete(
    messages: LlmMessage[],
    tools: readonly LlmToolDefinition[],
  ): Promise<LlmTurn> {
    this.requests.push({ messages, tools });
    const next = this.turns.shift();
    if (!next) throw new Error('Mock provider has no remaining turn');
    if (next instanceof Error) throw next;
    return next;
  }
}

function toolCall(name: string, argumentsValue: unknown): LlmToolCall {
  return { id: `call-${name}`, name, arguments: argumentsValue };
}

function stubMethod(
  model: object,
  methodName: string,
  implementation: (...args: unknown[]) => Promise<unknown>,
): () => void {
  const delegate = model as unknown as Record<string, unknown>;
  const original = delegate[methodName];
  Object.defineProperty(delegate, methodName, {
    configurable: true,
    writable: true,
    value: implementation,
  });
  return () => {
    Object.defineProperty(delegate, methodName, {
      configurable: true,
      writable: true,
      value: original,
    });
  };
}

function emissionRecord(co2Kg: number | null = 1200) {
  return {
    id: 'log-1',
    industry: { id: 'industry-1', name: 'Demo Plant', sector: 'STEEL', city: 'Mumbai', state: 'Maharashtra' },
    periodStart: new Date('2026-09-01T00:00:00.000Z'),
    periodEnd: new Date('2026-09-30T00:00:00.000Z'),
    recordedAt: new Date('2026-10-01T00:00:00.000Z'),
    co2Kg: co2Kg === null ? null : new Prisma.Decimal(co2Kg),
    noxKg: new Prisma.Decimal(500),
    soxKg: new Prisma.Decimal(200),
    pm25Ugm3: new Prisma.Decimal(25),
    co2Status: 'VIOLATION',
    noxStatus: 'COMPLIANT',
    soxStatus: 'COMPLIANT',
    overallStatus: 'VIOLATION',
    electricityKwh: new Prisma.Decimal(10_000),
    productionVolume: new Prisma.Decimal(500),
    productionUnit: 'tonnes',
    fuelEntries: [{ fuelType: 'COAL', quantity: new Prisma.Decimal(1), unit: 'tonne' }],
    notes: null,
  };
}

function thresholdRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'threshold-1',
    sector: 'STEEL',
    pollutant: 'CO2',
    unit: 'kg/month',
    warningLimit: new Prisma.Decimal(1000),
    violationLimit: new Prisma.Decimal(1100),
    effectiveFrom: new Date('2025-01-01T00:00:00.000Z'),
    effectiveUntil: null,
    isActive: true,
    notes: 'Stored test threshold',
    ...overrides,
  };
}

async function retrieveWithMock(
  tool: string,
  argumentsValue: unknown,
  provider = new MockLlmProvider([
    { toolCalls: [toolCall(tool, argumentsValue)] },
    { text: 'This explanation refers only to the structured retrieval result.' },
  ]),
) {
  return answerWithRetrievalTools(industryUser, 'Ask about my plant data', provider);
}

test('LLM selects the emissions tool and receives only approved tool definitions', async () => {
  const restore = stubMethod(prisma.emissionLog, 'findMany', async () => [emissionRecord()]);
  const provider = new MockLlmProvider([
    { toolCalls: [toolCall('emissions', { industryId: 'industry-1', pollutant: 'CO2' })] },
    { text: 'The retrieved CO2 record is 1,200 kg.' },
  ]);
  try {
    const result = await answerWithRetrievalTools(industryUser, 'Show CO2 emissions', provider);
    assert.equal(result.tool, 'emissions');
    assert.equal(result.status, 'SUCCESS');
    assert.deepEqual(
      provider.requests[0]?.tools.map((tool) => tool.function.name),
      ['emissions', 'compliance', 'threshold', 'anomalies'],
    );
    assert.equal(provider.requests[1]?.tools.length, 0);
  } finally {
    restore();
  }
});

test('LLM selects compliance and receives the backend compliance result', async () => {
  const restoreIndustry = stubMethod(prisma.industry, 'findUnique', async () => ({
    id: 'industry-1', name: 'Demo Plant', sector: 'STEEL',
  }));
  const restoreEmissions = stubMethod(prisma.emissionLog, 'findMany', async () => [emissionRecord()]);
  const restoreThresholds = stubMethod(prisma.complianceThreshold, 'findMany', async () => [thresholdRecord()]);
  const provider = new MockLlmProvider([
    { toolCalls: [toolCall('compliance', { industryId: 'industry-1', pollutant: 'CO2' })] },
    { text: 'The stored threshold is exceeded.' },
  ]);
  try {
    const result = await answerWithRetrievalTools(industryUser, 'Am I violating CO2?', provider);
    assert.equal(result.tool, 'compliance');
    assert.equal(result.status, 'SUCCESS');
    const toolResult = provider.requests[1]?.messages.at(-1);
    assert.equal(toolResult?.role, 'tool');
    assert.match(toolResult?.content ?? '', /"status":"VIOLATION"/);
  } finally {
    restoreThresholds();
    restoreEmissions();
    restoreIndustry();
  }
});

test('LLM selects the threshold tool and receives stored limits', async () => {
  const restoreIndustry = stubMethod(prisma.industry, 'findUnique', async () => ({
    id: 'industry-1', name: 'Demo Plant', sector: 'STEEL',
  }));
  const restoreThresholds = stubMethod(prisma.complianceThreshold, 'findMany', async () => [thresholdRecord()]);
  try {
    const result = await retrieveWithMock('threshold', {
      industryId: 'industry-1',
      pollutant: 'CO2',
      periodStart: '2026-09-01T00:00:00.000Z',
      periodEnd: '2026-09-30T00:00:00.000Z',
    });
    assert.equal(result.tool, 'threshold');
    assert.equal(result.status, 'SUCCESS');
    assert.match(JSON.stringify(result.result), /1100/);
  } finally {
    restoreThresholds();
    restoreIndustry();
  }
});

test('LLM selects the anomaly tool and receives deterministic anomaly output', async () => {
  const restore = stubMethod(prisma.emissionLog, 'findMany', async () =>
    [1000, 1010, 990, 1800].map((co2Kg, index) => ({
      ...emissionRecord(co2Kg),
      id: `log-${index}`,
      periodStart: new Date(Date.UTC(2026, index, 1)),
      periodEnd: new Date(Date.UTC(2026, index + 1, 0)),
      fuelEntries: [{ fuelType: 'COAL', quantity: new Prisma.Decimal(co2Kg / 1000), unit: 'tonne' }],
    })),
  );
  try {
    const result = await retrieveWithMock('anomalies', { industryId: 'industry-1' });
    assert.equal(result.tool, 'anomalies');
    assert.ok(JSON.stringify(result.result).includes('EMISSION_SPIKE'));
  } finally {
    restore();
  }
});

test('unsupported questions receive a fixed unsupported answer without retrieval', async () => {
  const provider = new MockLlmProvider([{ text: 'A guess about unsupported data.' }]);
  const result = await answerWithRetrievalTools(industryUser, 'What is tomorrow weather?', provider);
  assert.equal(result.status, 'UNSUPPORTED');
  assert.equal(result.tool, null);
  assert.match(result.answer, /outside the currently supported retrieval capabilities/);
  assert.equal(provider.requests.length, 1);
});

test('unsupported tool names and malformed tool arguments are rejected', async () => {
  await assert.rejects(
    retrieveWithMock('raw_sql', { query: 'SELECT * FROM users' }),
    { statusCode: 502, code: 'LLM_TOOL_NOT_ALLOWED' },
  );
  await assert.rejects(
    retrieveWithMock('emissions', { industryId: 'industry-1', limit: 0, extra: true }),
  );
});

test('model-selected industry IDs cannot bypass backend scope', async () => {
  let databaseCalled = false;
  const restore = stubMethod(prisma.emissionLog, 'findMany', async () => {
    databaseCalled = true;
    return [];
  });
  try {
    await assert.rejects(
      retrieveWithMock('emissions', { industryId: 'industry-2' }),
      { statusCode: 403 },
    );
    assert.equal(databaseCalled, false);
  } finally {
    restore();
  }
});

test('retrieval statuses are preserved for LLM explanation', async () => {
  const restore = stubMethod(prisma.emissionLog, 'findMany', async () => []);
  const provider = new MockLlmProvider([
    { toolCalls: [toolCall('emissions', { industryId: 'industry-1' })] },
    { text: 'No matching emissions were returned.' },
  ]);
  try {
    const result = await answerWithRetrievalTools(industryUser, 'Show emissions', provider);
    assert.equal(result.status, 'NO_DATA');
    assert.equal(result.result?.status, 'NO_DATA');
  } finally {
    restore();
  }
});

test('NO_APPLICABLE_THRESHOLD status is preserved for the LLM and API caller', async () => {
  const restoreIndustry = stubMethod(prisma.industry, 'findUnique', async () => ({
    id: 'industry-1', name: 'Demo Plant', sector: 'STEEL',
  }));
  const restoreThresholds = stubMethod(prisma.complianceThreshold, 'findMany', async () => []);
  const provider = new MockLlmProvider([
    {
      toolCalls: [toolCall('threshold', {
        industryId: 'industry-1',
        pollutant: 'CO2',
        periodStart: '2026-09-01T00:00:00.000Z',
        periodEnd: '2026-09-30T00:00:00.000Z',
      })],
    },
    { text: 'No stored applicable threshold was found.' },
  ]);
  try {
    const result = await answerWithRetrievalTools(industryUser, 'What is my CO2 limit?', provider);
    assert.equal(result.status, 'NO_APPLICABLE_THRESHOLD');
    assert.equal(result.result?.status, 'NO_APPLICABLE_THRESHOLD');
  } finally {
    restoreThresholds();
    restoreIndustry();
  }
});

test('provider failure is returned safely without exposing provider response details', async () => {
  const secretBody = 'sensitive provider response content';
  const provider = new CompatibleChatProvider(
    { apiUrl: 'http://example.invalid/v1/chat/completions', model: 'test-model', apiKey: 'test-secret' },
    (async () => ({
      ok: false,
      status: 503,
      json: async () => ({ error: secretBody }),
    }) as unknown as Response),
  );
  await assert.rejects(
    provider.complete([{ role: 'user', content: 'test' }], RETRIEVAL_TOOL_DEFINITIONS),
    (error: unknown) => {
      assert.equal((error as ApiError).statusCode, 502);
      assert.equal((error as Error).message.includes(secretBody), false);
      assert.equal((error as Error).message.includes('test-secret'), false);
      return true;
    },
  );
});

function invokeHandler(
  handler: RequestHandler,
  body: unknown,
): Promise<{ statusCode: number; body: unknown }> {
  return new Promise((resolve, reject) => {
    const responseData = { statusCode: 200, body: undefined as unknown };
    const request = {
      user: industryUser,
      body,
      headers: {},
    } as unknown as Request;
    const response = {
      status(code: number) {
        responseData.statusCode = code;
        return this;
      },
      json(value: unknown) {
        responseData.body = value;
        resolve(responseData);
        return this;
      },
    } as unknown as ExpressResponse;
    handler(request, response, (error) => {
      if (error) reject(error);
    });
  });
}

test('assistant route response does not contain provider API credentials', async () => {
  const secret = 'server-only-test-key';
  const provider = Object.assign(new MockLlmProvider([
    { toolCalls: [toolCall('emissions', { industryId: 'industry-1' })] },
    { text: 'Retrieved results are available.' },
  ]), { apiKey: secret });
  const restore = stubMethod(prisma.emissionLog, 'findMany', async () => []);
  try {
    const response = await invokeHandler(
      createAssistantController(() => provider),
      { question: 'Show my emissions' },
    );
    const responseText = JSON.stringify(response.body);
    assert.equal(responseText.includes(secret), false);
    assert.equal(responseText.includes('apiKey'), false);
  } finally {
    restore();
  }
});

test('assistant endpoint reports missing provider configuration without calling the LLM', async () => {
  const response = createAssistantController(() => null);
  await assert.rejects(
    invokeHandler(response, { question: 'Show my emissions' }),
    { statusCode: 503, code: 'LLM_NOT_CONFIGURED' },
  );
});

test('assistant route is registered behind the existing authentication middleware', () => {
  const stack = (insightsRouter as unknown as {
    stack: Array<{
      name?: string;
      route?: { path?: string; methods?: Record<string, boolean> };
    }>;
  }).stack;
  const assistantRouteIndex = stack.findIndex(
    (layer) => layer.route?.path === '/assistant' && layer.route.methods?.post,
  );

  assert.ok(assistantRouteIndex > 0);
  assert.equal(stack[0]?.name, 'requireAuth');
});