import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDemoMonthlyRecords,
  DEMO_INDUSTRIES,
} from './demoSeedData';
import { validateEmissionRecords } from '../src/services/analytics/validationEngine';

test('demo seed scenarios are deterministic and cover three steel plants', () => {
  for (const industry of DEMO_INDUSTRIES) {
    assert.deepEqual(
      buildDemoMonthlyRecords(industry.scenario),
      buildDemoMonthlyRecords(industry.scenario),
    );
  }

  assert.equal(
    DEMO_INDUSTRIES.filter((industry) => industry.sector === 'STEEL').length,
    3,
  );
});

test('Mumbai September exceeds its reference threshold after a coal increase', () => {
  const mumbai = DEMO_INDUSTRIES.find(
    (industry) => industry.scenario === 'mumbai-violation',
  );
  assert.ok(mumbai);

  const records = buildDemoMonthlyRecords(mumbai.scenario);
  const august = records[10];
  const september = records[11];
  assert.ok(august && september);
  assert.ok(september.co2Kg > mumbai.violationLimitKg);
  assert.ok(september.coalTonnes > august.coalTonnes);
});

test('fuel, sudden-drop, and electricity scenarios produce validation findings', () => {
  const expectedTypes = new Map([
    ['fuel-mismatch', 'EMISSION_FUEL_MISMATCH'],
    ['sudden-drop', 'EMISSION_INTENSITY_CHANGE'],
    ['electricity-mismatch', 'ELECTRICITY_PRODUCTION_MISMATCH'],
  ]);

  for (const [scenario, expectedType] of expectedTypes) {
    const records = buildDemoMonthlyRecords(scenario as 'fuel-mismatch' | 'sudden-drop' | 'electricity-mismatch');
    const findings = validateEmissionRecords(
      records.map((record, index) => ({
        id: `${scenario}-${index}`,
        periodStart: record.periodStart,
        periodEnd: record.periodEnd,
        co2Kg: record.co2Kg,
        electricityKwh: record.electricityKwh,
        productionVolume: record.productionVolume,
        productionUnit: 'tonnes',
        fuelEntries: [{
          fuelType: 'COAL',
          quantity: record.coalTonnes,
          unit: 'tonne',
        }],
      })),
      { now: new Date('2026-10-03T00:00:00.000Z') },
    );

    assert.ok(findings.some((finding) => finding.type === expectedType));
  }
});