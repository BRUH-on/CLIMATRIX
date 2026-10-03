import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assessEmissionCompliance,
  type ComplianceEmissionInput,
  type ComplianceThresholdInput,
} from './complianceEngine';

const emission: ComplianceEmissionInput = {
  id: 'log-september',
  sector: 'STEEL',
  periodStart: new Date('2026-09-01T00:00:00.000Z'),
  periodEnd: new Date('2026-09-30T00:00:00.000Z'),
  co2Kg: 96_800,
  noxKg: 1_700,
  soxKg: 300,
  pm25Ugm3: null,
};

const threshold = (
  pollutant: string,
  warningLimit: number,
  violationLimit: number,
  overrides: Partial<ComplianceThresholdInput> = {},
): ComplianceThresholdInput => ({
  id: `threshold-${pollutant}`,
  sector: 'STEEL',
  pollutant,
  unit: 'kg/month',
  warningLimit,
  violationLimit,
  effectiveFrom: new Date('2025-01-01T00:00:00.000Z'),
  effectiveUntil: null,
  notes: 'Demo threshold',
  ...overrides,
});

test('calculates violation excess, percentage, reduction target, and explanation', () => {
  const [assessment] = assessEmissionCompliance(emission, [
    threshold('CO2', 60_000, 75_000),
  ], 'CO2');

  assert.ok(assessment);
  assert.equal(assessment.status, 'VIOLATION');
  assert.equal(assessment.exceedanceAmount, 21_800);
  assert.equal(assessment.exceedancePercent, 29.07);
  assert.equal(assessment.requiredReduction, 36_800);
  assert.equal(assessment.requiredReductionTarget, 60_000);
  assert.match(assessment.explanation, /stored violation limit/);
});

test('classifies warning and computes reduction to the compliant warning limit', () => {
  const [assessment] = assessEmissionCompliance(emission, [
    threshold('NOX', 1_500, 2_500),
  ], 'NOX');

  assert.ok(assessment);
  assert.equal(assessment.status, 'WARNING');
  assert.equal(assessment.exceedanceAmount, 0);
  assert.equal(assessment.requiredReduction, 200);
});

test('reports compliant at the warning limit and returns no assessment for missing data', () => {
  const atLimit = { ...emission, co2Kg: 60_000 };
  const [assessment] = assessEmissionCompliance(atLimit, [
    threshold('CO2', 60_000, 75_000),
  ], 'CO2');
  const missing = assessEmissionCompliance(
    { ...emission, co2Kg: null },
    [threshold('CO2', 60_000, 75_000)],
    'CO2',
  );

  assert.equal(assessment?.status, 'COMPLIANT');
  assert.deepEqual(missing, []);
});

test('selects the newest threshold covering the full period and rejects unit mismatch', () => {
  const oldThreshold = threshold('CO2', 50_000, 70_000, {
    effectiveUntil: new Date('2026-08-31T00:00:00.000Z'),
  });
  const currentThreshold = threshold('CO2', 60_000, 75_000, {
    id: 'threshold-current',
    effectiveFrom: new Date('2026-09-01T00:00:00.000Z'),
  });
  const [assessment] = assessEmissionCompliance(
    emission,
    [oldThreshold, currentThreshold],
    'CO2',
  );
  const [incompatible] = assessEmissionCompliance(
    emission,
    [threshold('CO2', 60_000, 75_000, { unit: 'tonnes/month' })],
    'CO2',
  );

  assert.equal(assessment?.violationLimit, 75_000);
  assert.equal(incompatible?.status, 'INCOMPATIBLE_THRESHOLD_UNIT');
  assert.equal(incompatible?.exceedanceAmount, null);
});

test('returns an explicit result when no threshold covers the emission period', () => {
  const [assessment] = assessEmissionCompliance(
    emission,
    [threshold('CO2', 60_000, 75_000, { effectiveFrom: new Date('2026-10-01T00:00:00.000Z') })],
    'CO2',
  );

  assert.equal(assessment?.status, 'NO_THRESHOLD');
  assert.equal(assessment?.violationLimit, null);
});

test('does not calculate against invalid stored limits', () => {
  const [assessment] = assessEmissionCompliance(
    emission,
    [threshold('CO2', 80_000, 75_000)],
    'CO2',
  );

  assert.equal(assessment?.status, 'INVALID_THRESHOLD');
  assert.equal(assessment?.exceedanceAmount, null);
});