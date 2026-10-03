import { ANOMALY_THRESHOLDS } from '../../constants/anomalyThresholds';
import {
  validateEmissionRecords,
  type ValidationEmissionRecord,
} from './validationEngine';

export interface AnomalyEmissionRecord extends ValidationEmissionRecord {}

export type EmissionAnomalyType =
  | 'EMISSION_SPIKE'
  | 'EMISSION_DROP'
  | 'CO2_PER_PRODUCTION_CHANGE'
  | 'FUEL_EMISSION_PATTERN_CHANGE';

export interface EmissionAnomaly {
  type: EmissionAnomalyType;
  severity: 'MEDIUM' | 'HIGH';
  affectedPeriod: { start: string; end: string };
  observedValue: number;
  baselineValue: number;
  unit: string;
  reason: string;
}

export function detectEmissionAnomalies(
  input: AnomalyEmissionRecord[],
): EmissionAnomaly[] {
  const records = [...input].sort(
    (left, right) => dateValue(left.periodStart) - dateValue(right.periodStart),
  );
  const anomalies: EmissionAnomaly[] = [];

  addEmissionChangeAnomalies(records, anomalies);
  addProductionIntensityAnomalies(records, anomalies);
  addFuelEmissionPatternAnomalies(records, anomalies);

  return anomalies.sort((left, right) => {
    const periodDifference =
      new Date(left.affectedPeriod.start).getTime() -
      new Date(right.affectedPeriod.start).getTime();
    return periodDifference || left.type.localeCompare(right.type);
  });
}

function addEmissionChangeAnomalies(
  records: AnomalyEmissionRecord[],
  anomalies: EmissionAnomaly[],
): void {
  for (let index = ANOMALY_THRESHOLDS.minimumHistoryRecords; index < records.length; index += 1) {
    const current = records[index];
    if (!current || current.co2Kg === null) continue;

    const history = records
      .slice(Math.max(0, index - ANOMALY_THRESHOLDS.historyWindowRecords), index)
      .map((record) => record.co2Kg)
      .filter((value): value is number => value !== null && value > 0);
    if (history.length < ANOMALY_THRESHOLDS.minimumHistoryRecords) continue;

    const baseline = median(history);
    if (baseline === null || baseline === 0) continue;
    const deviationPercent = ((current.co2Kg - baseline) / baseline) * 100;
    if (Math.abs(deviationPercent) < ANOMALY_THRESHOLDS.deviationPercent) continue;

    const type = deviationPercent > 0 ? 'EMISSION_SPIKE' : 'EMISSION_DROP';
    anomalies.push({
      type,
      severity: severityFor(deviationPercent),
      affectedPeriod: periodOf(current),
      observedValue: round(current.co2Kg),
      baselineValue: round(baseline),
      unit: 'kg CO2',
      reason: `Reported CO2 is ${Math.abs(deviationPercent).toFixed(1)}% ${deviationPercent > 0 ? 'above' : 'below'} the median of ${history.length} preceding records.`,
    });
  }
}

function addProductionIntensityAnomalies(
  records: AnomalyEmissionRecord[],
  anomalies: EmissionAnomaly[],
): void {
  const recordsById = new Map(records.map((record) => [record.id, record]));
  const findings = validateEmissionRecords(records).filter(
    (finding) => finding.type === 'EMISSION_INTENSITY_CHANGE',
  );

  for (const finding of findings) {
    const recordId = finding.evidence.recordId;
    if (typeof recordId !== 'string') continue;
    const record = recordsById.get(recordId);
    const observed = finding.evidence.currentCO2PerProductionUnit;
    const baseline = finding.evidence.historicalMedianCO2PerProductionUnit;
    if (!record || typeof observed !== 'number' || typeof baseline !== 'number') continue;

    anomalies.push({
      type: 'CO2_PER_PRODUCTION_CHANGE',
      severity: finding.severity === 'HIGH' ? 'HIGH' : 'MEDIUM',
      affectedPeriod: periodOf(record),
      observedValue: observed,
      baselineValue: baseline,
      unit: `kg CO2 per ${record.productionUnit}`,
      reason: `${finding.message} Observed change: ${finding.evidence.changePercent}%.`,
    });
  }
}

function addFuelEmissionPatternAnomalies(
  records: AnomalyEmissionRecord[],
  anomalies: EmissionAnomaly[],
): void {
  for (let index = ANOMALY_THRESHOLDS.minimumHistoryRecords; index < records.length; index += 1) {
    const current = records[index];
    if (!current || current.co2Kg === null || current.co2Kg <= 0) continue;

    const currentFuelGroups = fuelQuantities(current);
    for (const [fuelKey, quantity] of currentFuelGroups) {
      const observed = current.co2Kg / quantity;
      const previousRatios = records
        .slice(Math.max(0, index - ANOMALY_THRESHOLDS.historyWindowRecords), index)
        .flatMap((record) => {
          if (record.co2Kg === null || record.co2Kg <= 0) return [];
          const previousQuantity = fuelQuantities(record).get(fuelKey);
          return previousQuantity && previousQuantity > 0
            ? [record.co2Kg / previousQuantity]
            : [];
        });
      if (previousRatios.length < ANOMALY_THRESHOLDS.minimumHistoryRecords) continue;

      const baseline = median(previousRatios);
      if (baseline === null || baseline <= 0) continue;
      const deviationPercent = ((observed - baseline) / baseline) * 100;
      if (Math.abs(deviationPercent) < ANOMALY_THRESHOLDS.deviationPercent) continue;

      const [fuelType, unit] = fuelKey.split('|');
      anomalies.push({
        type: 'FUEL_EMISSION_PATTERN_CHANGE',
        severity: severityFor(deviationPercent),
        affectedPeriod: periodOf(current),
        observedValue: round(observed),
        baselineValue: round(baseline),
        unit: `kg CO2 per ${unit ?? 'fuel unit'} of ${fuelType ?? 'fuel'}`,
        reason: `Reported CO2 per unit of ${fuelType ?? 'fuel'} is ${Math.abs(deviationPercent).toFixed(1)}% ${deviationPercent > 0 ? 'above' : 'below'} its historical median. This is a pattern change, not proof of cause.`,
      });
    }
  }
}

function fuelQuantities(record: AnomalyEmissionRecord): Map<string, number> {
  const totals = new Map<string, number>();
  for (const entry of record.fuelEntries) {
    if (!Number.isFinite(entry.quantity) || entry.quantity <= 0) continue;
    const key = `${entry.fuelType}|${normalizeUnit(entry.unit)}`;
    totals.set(key, (totals.get(key) ?? 0) + entry.quantity);
  }
  return totals;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const lower = sorted[middle - 1];
  const upper = sorted[middle];
  if (upper === undefined) return null;
  return sorted.length % 2 === 0 && lower !== undefined
    ? (lower + upper) / 2
    : upper;
}

function severityFor(deviationPercent: number): 'MEDIUM' | 'HIGH' {
  return Math.abs(deviationPercent) >= ANOMALY_THRESHOLDS.highSeverityDeviationPercent
    ? 'HIGH'
    : 'MEDIUM';
}

function periodOf(record: AnomalyEmissionRecord): { start: string; end: string } {
  return {
    start: dateOnly(record.periodStart),
    end: dateOnly(record.periodEnd),
  };
}

function dateOnly(value: Date | string): string {
  return new Date(value).toISOString().slice(0, 10);
}

function dateValue(value: Date | string): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function normalizeUnit(value: string): string {
  return value.trim().toLowerCase().replace(/s$/, '');
}

function round(value: number): number {
  return Number(value.toFixed(2));
}