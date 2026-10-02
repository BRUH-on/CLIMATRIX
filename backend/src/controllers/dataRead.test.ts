import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, RequestHandler, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma/client';
import { list as listIndustries } from './industry.controller';
import { list as listEmissions } from './emission.controller';
import {
  getIndustryComplianceAssessments,
  getIndustryAnomalies,
  validateIndustry,
} from './insights.controller';
import { retrieve } from './retrieval.controller';
import { requireAuth } from '../middleware/requireAuth';

interface CapturedResponse {
  statusCode: number;
  body: unknown;
}

function invokeHandler(
  handler: RequestHandler,
  requestData: {
    user: { id: string; role: 'ADMIN' | 'INSPECTOR' | 'INDUSTRY'; industryId: string | null };
    params?: Record<string, string>;
    query?: Record<string, string>;
    body?: unknown;
  },
): Promise<CapturedResponse> {
  return new Promise((resolve, reject) => {
    const captured: CapturedResponse = { statusCode: 200, body: undefined };
    const request = {
      user: requestData.user,
      params: requestData.params ?? {},
      query: requestData.query ?? {},
      body: requestData.body ?? {},
    } as unknown as Request;
    const response = {
      status(code: number) {
        captured.statusCode = code;
        return this;
      },
      json(body: unknown) {
        captured.body = body;
        resolve(captured);
        return this;
      },
    } as unknown as Response;

    handler(request, response, (error) => {
      if (error) reject(error);
    });
  });
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

const admin = { id: 'admin-1', role: 'ADMIN' as const, industryId: null };

test('industry list returns Prisma data and constrains industry users to their own id', async () => {
  let queryArgs: unknown;
  const restore = stubMethod(prisma.industry, 'findMany', async (args) => {
    queryArgs = args;
    return [
      {
        id: 'industry-1',
        name: 'Demo Steel',
        sector: 'STEEL',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'IN',
        addressLine1: 'Demo Estate',
        latitude: new Prisma.Decimal('19.076'),
        longitude: new Prisma.Decimal('72.8777'),
        isActive: true,
        _count: { emissionLogs: 1 },
        emissionLogs: [],
      },
    ];
  });

  try {
    const result = await invokeHandler(listIndustries, {
      user: { id: 'industry-user', role: 'INDUSTRY', industryId: 'industry-1' },
    });
    const body = result.body as { count: number; industries: Array<{ id: string; name: string }> };
    assert.equal(body.count, 1);
    assert.equal(body.industries[0]?.name, 'Demo Steel');
    assert.deepEqual(
      (queryArgs as { where: { id: { in: string[] } } }).where.id.in,
      ['industry-1'],
    );
  } finally {
    restore();
  }
});

test('emissions list returns database fields and applies date and pollutant filters', async () => {
  let queryArgs: unknown;
  const restore = stubMethod(prisma.emissionLog, 'findMany', async (args) => {
    queryArgs = args;
    return [
      {
        id: 'emission-1',
        industry: { id: 'industry-1', name: 'Demo Steel', sector: 'STEEL', city: 'Mumbai', state: 'Maharashtra' },
        periodStart: new Date('2026-09-01T00:00:00.000Z'),
        periodEnd: new Date('2026-09-30T00:00:00.000Z'),
        recordedAt: new Date('2026-10-01T12:00:00.000Z'),
        co2Kg: new Prisma.Decimal(96_800),
        noxKg: new Prisma.Decimal(1_000),
        soxKg: new Prisma.Decimal(300),
        pm25Ugm3: new Prisma.Decimal(25),
        co2Status: 'VIOLATION',
        noxStatus: 'COMPLIANT',
        soxStatus: 'COMPLIANT',
        overallStatus: 'VIOLATION',
        electricityKwh: new Prisma.Decimal(50_000),
        productionVolume: new Prisma.Decimal(2_350),
        productionUnit: 'tonnes',
        fuelEntries: [{ fuelType: 'COAL', quantity: new Prisma.Decimal(40), unit: 'tonne' }],
        notes: 'DEMO/REFERENCE DATA ONLY',
      },
    ];
  });

  try {
    const result = await invokeHandler(listEmissions, {
      user: admin,
      query: {
        pollutant: 'CO2',
        startDate: '2026-09-01T00:00:00.000Z',
        endDate: '2026-09-30T00:00:00.000Z',
      },
    });
    const body = result.body as { emissions: Array<{ co2Kg: number; fuelEntries: unknown[] }> };
    assert.equal(body.emissions[0]?.co2Kg, 96_800);
    assert.equal(body.emissions[0]?.fuelEntries.length, 1);
    const where = (queryArgs as { where: Record<string, unknown> }).where;
    assert.deepEqual(where.co2Kg, { not: null });
    assert.ok('periodEnd' in where && 'periodStart' in where);
  } finally {
    restore();
  }
});

test('industry users cannot request another industry’s emissions', async () => {
  await assert.rejects(
    invokeHandler(listEmissions, {
      user: { id: 'industry-user', role: 'INDUSTRY', industryId: 'industry-1' },
      query: { industryId: 'industry-2' },
    }),
    { statusCode: 403 },
  );
});

test('validation endpoint returns structured findings from Prisma records', async () => {
  const restoreIndustry = stubMethod(prisma.industry, 'findFirst', async () => ({ id: 'industry-1' }));
  const restoreEmissions = stubMethod(prisma.emissionLog, 'findMany', async () => [
    {
      id: 'emission-1',
      periodStart: new Date('2026-09-01T00:00:00.000Z'),
      periodEnd: new Date('2026-09-30T00:00:00.000Z'),
      co2Kg: new Prisma.Decimal(10_000),
      electricityKwh: new Prisma.Decimal(10_000),
      productionVolume: new Prisma.Decimal(1_000),
      productionUnit: 'tonnes',
      fuelEntries: [{ fuelType: 'COAL', quantity: new Prisma.Decimal(10), unit: 'tonne' }],
    },
  ]);

  try {
    const result = await invokeHandler(validateIndustry, {
      user: admin,
      query: { industryId: 'industry-1' },
    });
    const body = result.body as {
      industryId: string;
      findingCount: number;
      findings: Array<{ type: string; evidence: Record<string, unknown> }>;
    };
    assert.equal(body.industryId, 'industry-1');
    assert.equal(body.findingCount, 1);
    assert.equal(body.findings[0]?.type, 'EMISSION_FUEL_MISMATCH');
    assert.equal(typeof body.findings[0]?.evidence.estimatedCO2Kg, 'number');
  } finally {
    restoreEmissions();
    restoreIndustry();
  }
});

test('anomaly endpoint returns authorized historical anomalies with period and baseline', async () => {
  const restoreIndustry = stubMethod(prisma.industry, 'findUnique', async () => ({
    id: 'industry-1',
    name: 'Demo Steel',
  }));
  const restoreEmissions = stubMethod(prisma.emissionLog, 'findMany', async () =>
    [20_000, 20_500, 19_800, 35_000].map((co2Kg, index) => ({
      id: `emission-${index}`,
      industry: { id: 'industry-1', name: 'Demo Steel', sector: 'STEEL', city: 'Mumbai', state: 'Maharashtra' },
      periodStart: new Date(Date.UTC(2026, index, 1)),
      periodEnd: new Date(Date.UTC(2026, index + 1, 0)),
      recordedAt: new Date(Date.UTC(2026, index + 1, 1)),
      co2Kg: new Prisma.Decimal(co2Kg),
      noxKg: new Prisma.Decimal(500),
      soxKg: new Prisma.Decimal(200),
      pm25Ugm3: null,
      co2Status: 'COMPLIANT',
      noxStatus: 'COMPLIANT',
      soxStatus: 'COMPLIANT',
      overallStatus: 'COMPLIANT',
      electricityKwh: new Prisma.Decimal(10_000),
      productionVolume: new Prisma.Decimal(1_000),
      productionUnit: 'tonne',
      fuelEntries: [{ fuelType: 'COAL', quantity: new Prisma.Decimal(co2Kg / 1000), unit: 'tonne' }],
      notes: null,
    })),
  );

  try {
    const result = await invokeHandler(getIndustryAnomalies, {
      user: { id: 'industry-user', role: 'INDUSTRY', industryId: 'industry-1' },
      query: { industryId: 'industry-1' },
    });
    const body = result.body as {
      industry: { id: string };
      analysisStatus: string;
      anomalyCount: number;
      anomalies: Array<{
        type: string;
        affectedPeriod: { start: string };
        observedValue: number;
        baselineValue: number;
      }>;
    };
    const spike = body.anomalies.find((anomaly) => anomaly.type === 'EMISSION_SPIKE');
    assert.equal(body.industry.id, 'industry-1');
    assert.equal(body.analysisStatus, 'COMPLETE');
    assert.ok(body.anomalyCount > 0);
    assert.ok(spike);
    assert.equal(spike.affectedPeriod.start, '2026-04-01');
    assert.equal(spike.observedValue, 35_000);
    assert.equal(spike.baselineValue, 20_000);
  } finally {
    restoreEmissions();
    restoreIndustry();
  }
});

test('anomaly endpoint rejects an industry outside an industry user’s scope', async () => {
  await assert.rejects(
    invokeHandler(getIndustryAnomalies, {
      user: { id: 'industry-user', role: 'INDUSTRY', industryId: 'industry-1' },
      query: { industryId: 'industry-2' },
    }),
    { statusCode: 403 },
  );
});

test('anomaly endpoint reports insufficient history when fewer than four CO2 records exist', async () => {
  const restoreIndustry = stubMethod(prisma.industry, 'findUnique', async () => ({
    id: 'industry-1',
    name: 'Demo Steel',
  }));
  const restoreEmissions = stubMethod(prisma.emissionLog, 'findMany', async () => [
    {
      id: 'emission-1',
      industry: { id: 'industry-1', name: 'Demo Steel', sector: 'STEEL', city: 'Mumbai', state: 'Maharashtra' },
      periodStart: new Date('2026-09-01T00:00:00.000Z'),
      periodEnd: new Date('2026-09-30T00:00:00.000Z'),
      recordedAt: new Date('2026-10-01T00:00:00.000Z'),
      co2Kg: new Prisma.Decimal(20_000),
      noxKg: null,
      soxKg: null,
      pm25Ugm3: null,
      co2Status: 'COMPLIANT',
      noxStatus: null,
      soxStatus: null,
      overallStatus: 'COMPLIANT',
      electricityKwh: new Prisma.Decimal(10_000),
      productionVolume: new Prisma.Decimal(1_000),
      productionUnit: 'tonne',
      fuelEntries: [],
      notes: null,
    },
  ]);

  try {
    const result = await invokeHandler(getIndustryAnomalies, {
      user: admin,
      query: { industryId: 'industry-1' },
    });
    assert.equal(
      (result.body as { analysisStatus: string }).analysisStatus,
      'INSUFFICIENT_HISTORY',
    );
  } finally {
    restoreEmissions();
    restoreIndustry();
  }
});

test('compliance endpoint returns stored-threshold calculations for an authorized industry', async () => {
  const restoreIndustry = stubMethod(prisma.industry, 'findUnique', async () => ({
    id: 'industry-1',
    name: 'Mumbai Steel Works',
    sector: 'STEEL',
  }));
  const restoreEmissions = stubMethod(prisma.emissionLog, 'findMany', async () => [
    {
      id: 'log-september',
      industry: { id: 'industry-1', name: 'Mumbai Steel Works', sector: 'STEEL', city: 'Mumbai', state: 'Maharashtra' },
      periodStart: new Date('2026-09-01T00:00:00.000Z'),
      periodEnd: new Date('2026-09-30T00:00:00.000Z'),
      recordedAt: new Date('2026-10-01T00:00:00.000Z'),
      co2Kg: new Prisma.Decimal(96_800),
      noxKg: null,
      soxKg: null,
      pm25Ugm3: null,
      co2Status: 'VIOLATION',
      noxStatus: null,
      soxStatus: null,
      overallStatus: 'VIOLATION',
      electricityKwh: new Prisma.Decimal(50_000),
      productionVolume: new Prisma.Decimal(2_350),
      productionUnit: 'tonnes',
      fuelEntries: [],
      notes: null,
    },
  ]);
  const restoreThresholds = stubMethod(prisma.complianceThreshold, 'findMany', async () => [
    {
      id: 'threshold-co2',
      sector: 'STEEL',
      pollutant: 'CO2',
      unit: 'kg/month',
      warningLimit: new Prisma.Decimal(60_000),
      violationLimit: new Prisma.Decimal(75_000),
      effectiveFrom: new Date('2025-10-01T00:00:00.000Z'),
      effectiveUntil: null,
      notes: 'Demo reference threshold',
    },
  ]);

  try {
    const result = await invokeHandler(getIndustryComplianceAssessments, {
      user: { id: 'industry-user', role: 'INDUSTRY', industryId: 'industry-1' },
      query: { industryId: 'industry-1', pollutant: 'CO2' },
    });
    const body = result.body as {
      violationCount: number;
      assessments: Array<{
        pollutant: string;
        status: string;
        exceedanceAmount: number;
        requiredReduction: number;
        period: { start: string };
        explanation: string;
      }>;
    };
    assert.equal(body.violationCount, 1);
    assert.equal(body.assessments[0]?.pollutant, 'CO2');
    assert.equal(body.assessments[0]?.status, 'VIOLATION');
    assert.equal(body.assessments[0]?.exceedanceAmount, 21_800);
    assert.equal(body.assessments[0]?.requiredReduction, 36_800);
    assert.equal(body.assessments[0]?.period.start, '2026-09-01');
    assert.match(body.assessments[0]?.explanation ?? '', /stored violation limit/);
  } finally {
    restoreThresholds();
    restoreEmissions();
    restoreIndustry();
  }
});

test('compliance endpoint denies industry access to another industry', async () => {
  await assert.rejects(
    invokeHandler(getIndustryComplianceAssessments, {
      user: { id: 'industry-user', role: 'INDUSTRY', industryId: 'industry-1' },
      query: { industryId: 'industry-2' },
    }),
    { statusCode: 403 },
  );
});

function retrievalEmission(co2Kg: number | null = 96_800) {
  return {
    id: 'retrieval-log-1',
    industry: { id: 'industry-1', name: 'Demo Steel', sector: 'STEEL', city: 'Mumbai', state: 'Maharashtra' },
    periodStart: new Date('2026-09-01T00:00:00.000Z'),
    periodEnd: new Date('2026-09-30T00:00:00.000Z'),
    recordedAt: new Date('2026-10-01T00:00:00.000Z'),
    co2Kg: co2Kg === null ? null : new Prisma.Decimal(co2Kg),
    noxKg: new Prisma.Decimal(1_000),
    soxKg: new Prisma.Decimal(300),
    pm25Ugm3: new Prisma.Decimal(25),
    co2Status: 'VIOLATION',
    noxStatus: 'COMPLIANT',
    soxStatus: 'COMPLIANT',
    overallStatus: 'VIOLATION',
    electricityKwh: new Prisma.Decimal(50_000),
    productionVolume: new Prisma.Decimal(2_350),
    productionUnit: 'tonnes',
    fuelEntries: [{ fuelType: 'COAL', quantity: new Prisma.Decimal(40), unit: 'tonne' }],
    notes: null,
  };
}

function retrievalThreshold(overrides: Record<string, unknown> = {}) {
  return {
    id: 'retrieval-threshold-1',
    sector: 'STEEL',
    pollutant: 'CO2',
    unit: 'kg/month',
    warningLimit: new Prisma.Decimal(60_000),
    violationLimit: new Prisma.Decimal(75_000),
    effectiveFrom: new Date('2025-10-01T00:00:00.000Z'),
    effectiveUntil: null,
    isActive: true,
    notes: 'Stored demo threshold',
    ...overrides,
  };
}

test('retrieval returns authorized emissions and applies pollutant/date filters', async () => {
  let queryArgs: unknown;
  const restore = stubMethod(prisma.emissionLog, 'findMany', async (args) => {
    queryArgs = args;
    return [retrievalEmission()];
  });

  try {
    const result = await invokeHandler(retrieve, {
      user: { id: 'industry-user', role: 'INDUSTRY', industryId: 'industry-1' },
      body: {
        tool: 'emissions',
        industryId: 'industry-1',
        pollutant: 'CO2',
        startDate: '2026-09-01T00:00:00.000Z',
        endDate: '2026-09-30T00:00:00.000Z',
      },
    });
    const body = result.body as {
      tool: string;
      status: string;
      data: { industryId: string; records: Array<{ co2Kg: number }> };
    };
    const where = (queryArgs as { where: Record<string, unknown> }).where;
    assert.equal(body.tool, 'emissions');
    assert.equal(body.status, 'SUCCESS');
    assert.equal(body.data.industryId, 'industry-1');
    assert.equal(body.data.records[0]?.co2Kg, 96_800);
    assert.deepEqual(where.industryId, { in: ['industry-1'] });
    assert.deepEqual(where.co2Kg, { not: null });
    assert.ok('periodEnd' in where && 'periodStart' in where);
  } finally {
    restore();
  }
});

test('retrieval returns NO_DATA for an empty emission query', async () => {
  const restore = stubMethod(prisma.emissionLog, 'findMany', async () => []);
  try {
    const result = await invokeHandler(retrieve, {
      user: { id: 'industry-user', role: 'INDUSTRY', industryId: 'industry-1' },
      body: { tool: 'emissions', industryId: 'industry-1' },
    });
    assert.equal((result.body as { status: string }).status, 'NO_DATA');
  } finally {
    restore();
  }
});

test('retrieval reuses compliance assessment results for violation queries', async () => {
  const restoreIndustry = stubMethod(prisma.industry, 'findUnique', async () => ({
    id: 'industry-1', name: 'Demo Steel', sector: 'STEEL',
  }));
  const restoreEmissions = stubMethod(prisma.emissionLog, 'findMany', async () => [retrievalEmission()]);
  const restoreThresholds = stubMethod(prisma.complianceThreshold, 'findMany', async () => [retrievalThreshold()]);

  try {
    const result = await invokeHandler(retrieve, {
      user: { id: 'industry-user', role: 'INDUSTRY', industryId: 'industry-1' },
      body: {
        tool: 'compliance',
        industryId: 'industry-1',
        pollutant: 'CO2',
        status: 'VIOLATION',
      },
    });
    const body = result.body as {
      status: string;
      data: { violationCount: number; assessments: Array<{ exceedanceAmount: number }> };
    };
    assert.equal(body.status, 'SUCCESS');
    assert.equal(body.data.violationCount, 1);
    assert.equal(body.data.assessments[0]?.exceedanceAmount, 21_800);
  } finally {
    restoreThresholds();
    restoreEmissions();
    restoreIndustry();
  }
});

test('threshold retrieval returns an applicable stored threshold', async () => {
  const restoreIndustry = stubMethod(prisma.industry, 'findUnique', async () => ({
    id: 'industry-1', name: 'Demo Steel', sector: 'STEEL',
  }));
  const restoreThresholds = stubMethod(prisma.complianceThreshold, 'findMany', async () => [retrievalThreshold()]);

  try {
    const result = await invokeHandler(retrieve, {
      user: { id: 'industry-user', role: 'INDUSTRY', industryId: 'industry-1' },
      body: {
        tool: 'threshold',
        industryId: 'industry-1',
        pollutant: 'CO2',
        periodStart: '2026-09-01T00:00:00.000Z',
        periodEnd: '2026-09-30T00:00:00.000Z',
      },
    });
    const body = result.body as { status: string; data: { threshold: { violationLimit: number } } };
    assert.equal(body.status, 'SUCCESS');
    assert.equal(body.data.threshold.violationLimit, 75_000);
  } finally {
    restoreThresholds();
    restoreIndustry();
  }
});

test('threshold retrieval exposes missing, invalid, and incompatible thresholds', async () => {
  const restoreIndustry = stubMethod(prisma.industry, 'findUnique', async () => ({
    id: 'industry-1', name: 'Demo Steel', sector: 'STEEL',
  }));
  const restoreThresholds = stubMethod(prisma.complianceThreshold, 'findMany', async (args) => {
    const query = args as { where?: { pollutant?: string } };
    if (query.where?.pollutant === 'NOX') return [];
    if (query.where?.pollutant === 'SOX') {
      return [retrievalThreshold({ pollutant: 'SOX', warningLimit: new Prisma.Decimal(80_000) })];
    }
    return [retrievalThreshold({ unit: 'tonnes/month' })];
  });

  try {
    const baseRequest = {
      industryId: 'industry-1',
      periodStart: '2026-09-01T00:00:00.000Z',
      periodEnd: '2026-09-30T00:00:00.000Z',
    };
    const noThreshold = await invokeHandler(retrieve, {
      user: admin,
      body: { tool: 'threshold', ...baseRequest, pollutant: 'NOX' },
    });
    const invalidThreshold = await invokeHandler(retrieve, {
      user: admin,
      body: { tool: 'threshold', ...baseRequest, pollutant: 'SOX' },
    });
    const unitMismatch = await invokeHandler(retrieve, {
      user: admin,
      body: { tool: 'threshold', ...baseRequest, pollutant: 'CO2' },
    });

    assert.equal((noThreshold.body as { status: string }).status, 'NO_APPLICABLE_THRESHOLD');
    assert.equal((invalidThreshold.body as { status: string }).status, 'INVALID_THRESHOLD');
    assert.equal((unitMismatch.body as { status: string }).status, 'UNIT_MISMATCH');
  } finally {
    restoreThresholds();
    restoreIndustry();
  }
});

test('retrieval denies cross-industry requests and auth middleware rejects missing credentials', async () => {
  await assert.rejects(
    invokeHandler(retrieve, {
      user: { id: 'industry-user', role: 'INDUSTRY', industryId: 'industry-1' },
      body: { tool: 'emissions', industryId: 'industry-2' },
    }),
    { statusCode: 403 },
  );

  let authError: unknown;
  requireAuth(
    { headers: {} } as Request,
    {} as Response,
    (error) => { authError = error; },
  );
  assert.equal((authError as { statusCode: number }).statusCode, 401);
});

test('anomaly retrieval reuses deterministic anomaly results', async () => {
  const restore = stubMethod(prisma.emissionLog, 'findMany', async () =>
    [20_000, 20_500, 19_800, 35_000].map((co2Kg, index) => ({
      ...retrievalEmission(co2Kg),
      id: `anomaly-log-${index}`,
      periodStart: new Date(Date.UTC(2026, index, 1)),
      periodEnd: new Date(Date.UTC(2026, index + 1, 0)),
      fuelEntries: [{ fuelType: 'COAL', quantity: new Prisma.Decimal(co2Kg / 1000), unit: 'tonne' }],
    })),
  );

  try {
    const result = await invokeHandler(retrieve, {
      user: admin,
      body: { tool: 'anomalies', industryId: 'industry-1' },
    });
    const body = result.body as {
      status: string;
      data: { anomalies: Array<{ type: string }> };
    };
    assert.equal(body.status, 'SUCCESS');
    assert.ok(body.data.anomalies.some((anomaly) => anomaly.type === 'EMISSION_SPIKE'));
  } finally {
    restore();
  }
});