import assert from 'node:assert/strict';
import test from 'node:test';
import type { Request, RequestHandler, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma/client';
import { list as listIndustries } from './industry.controller';
import { list as listEmissions } from './emission.controller';
import { validateIndustry } from './insights.controller';

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
  },
): Promise<CapturedResponse> {
  return new Promise((resolve, reject) => {
    const captured: CapturedResponse = { statusCode: 200, body: undefined };
    const request = {
      user: requestData.user,
      params: requestData.params ?? {},
      query: requestData.query ?? {},
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