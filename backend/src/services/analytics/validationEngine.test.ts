import assert from 'node:assert/strict';
import test from 'node:test';
import {
  validateEmissionRecords,
  type ValidationEmissionRecord,
} from './validationEngine';

function record(
  month: number,
  overrides: Partial<ValidationEmissionRecord> = {},
): ValidationEmissionRecord {
  const periodStart = new Date(Date.UTC(2026, month, 1));
  const periodEnd = new Date(Date.UTC(2026, month + 1, 0));
  return {
    id: `record-${month}`,
    periodStart,
    periodEnd,
    co2Kg: 24_200,
    electricityKwh: 10_000,
    productionVolume: 1_000,
    productionUnit: 'tonnes',
    fuelEntries: [{ fuelType: 'COAL', quantity: 10, unit: 'tonnes' }],
    ...overrides,
  };
}

test('flags reported CO2 that materially differs from the provisional fuel estimate', () => {
  const findings = validateEmissionRecords([
    record(0, { co2Kg: 10_000 }),
  ]);

  assert.equal(findings[0]?.type, 'EMISSION_FUEL_MISMATCH');
  assert.equal(findings[0]?.severity, 'HIGH');
  assert.equal(findings[0]?.evidence.estimatedCO2Kg, 24_200);
});

test('does not flag a normal record matching the provisional factor', () => {
  const findings = validateEmissionRecords([record(0)]);

  assert.deepEqual(findings, []);
});

test('detects a missing month, future period, and electricity inconsistency deterministically', () => {
  const history = [record(0), record(1), record(2)];
  const current = record(4, {
    electricityKwh: 100_000,
    periodEnd: new Date('2026-05-31T00:00:00.000Z'),
  });
  const findings = validateEmissionRecords([...history, current], {
    now: new Date('2026-04-01T00:00:00.000Z'),
  });

  assert.ok(findings.some((finding) => finding.type === 'MISSING_PERIOD'));
  assert.ok(findings.some((finding) => finding.type === 'FUTURE_PERIOD'));
  assert.ok(
    findings.some((finding) => finding.type === 'ELECTRICITY_PRODUCTION_MISMATCH'),
  );
});