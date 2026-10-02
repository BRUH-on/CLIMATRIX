import assert from 'node:assert/strict';
import test from 'node:test';
import {
  detectEmissionAnomalies,
  type AnomalyEmissionRecord,
} from './anomalyEngine';

function makeHistory(co2Values: number[]): AnomalyEmissionRecord[] {
  return co2Values.map((co2Kg, index) => {
    const periodStart = new Date(Date.UTC(2026, index, 1));
    return {
      id: `log-${index}`,
      periodStart,
      periodEnd: new Date(Date.UTC(2026, index + 1, 0)),
      co2Kg,
      electricityKwh: 10_000,
      productionVolume: 1_000,
      productionUnit: 'tonne',
      fuelEntries: [{ fuelType: 'COAL', quantity: co2Kg / 1000, unit: 'tonne' }],
    };
  });
}

test('normal history produces no anomalies', () => {
  const anomalies = detectEmissionAnomalies(makeHistory([20_000, 20_500, 19_800, 20_200]));
  assert.deepEqual(anomalies, []);
});

test('detects a sudden emission spike with a historical baseline', () => {
  const anomalies = detectEmissionAnomalies(makeHistory([20_000, 20_500, 19_800, 35_000]));
  const spike = anomalies.find((anomaly) => anomaly.type === 'EMISSION_SPIKE');

  assert.ok(spike);
  assert.equal(spike.severity, 'MEDIUM');
  assert.equal(spike.observedValue, 35_000);
  assert.equal(spike.baselineValue, 20_000);
  assert.equal(spike.affectedPeriod.start, '2026-04-01');
});

test('detects a sudden emissions drop with a historical baseline', () => {
  const anomalies = detectEmissionAnomalies(makeHistory([20_000, 20_500, 19_800, 10_000]));
  const drop = anomalies.find((anomaly) => anomaly.type === 'EMISSION_DROP');

  assert.ok(drop);
  assert.equal(drop.observedValue, 10_000);
  assert.equal(drop.baselineValue, 20_000);
});

test('does not evaluate anomalies before the minimum history is available', () => {
  const anomalies = detectEmissionAnomalies(makeHistory([20_000, 20_500, 35_000]));
  assert.deepEqual(anomalies, []);
});

test('detects unusual CO2 per production and fuel/emission ratios', () => {
  const records = makeHistory([20_000, 20_500, 19_800, 35_000]).map((record, index) =>
    index === 3
      ? {
          ...record,
          productionVolume: 500,
          fuelEntries: [{ fuelType: 'COAL', quantity: 60, unit: 'tonne' }],
        }
      : record,
  );
  const anomalies = detectEmissionAnomalies(records);

  assert.ok(anomalies.some((anomaly) => anomaly.type === 'CO2_PER_PRODUCTION_CHANGE'));
  assert.ok(anomalies.some((anomaly) => anomaly.type === 'FUEL_EMISSION_PATTERN_CHANGE'));
});