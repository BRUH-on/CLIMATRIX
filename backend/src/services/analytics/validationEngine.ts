import {
  PROVISIONAL_CO2_FACTORS,
  VALIDATION_TOLERANCES,
} from '../../constants/emissionFactors';

export interface ValidationFuelEntry {
  fuelType: string;
  quantity: number;
  unit: string;
}

export interface ValidationEmissionRecord {
  id: string;
  periodStart: Date | string;
  periodEnd: Date | string;
  co2Kg: number | null;
  electricityKwh: number;
  productionVolume: number;
  productionUnit: string;
  fuelEntries: ValidationFuelEntry[];
}

export interface ValidationFinding {
  type:
    | 'EMISSION_FUEL_MISMATCH'
    | 'EMISSION_INTENSITY_CHANGE'
    | 'ELECTRICITY_PRODUCTION_MISMATCH'
    | 'INVALID_PERIOD'
    | 'FUTURE_PERIOD'
    | 'DUPLICATE_PERIOD'
    | 'MISSING_PERIOD';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
  evidence: Record<string, string | number | null>;
}

export interface ValidationOptions {
  now?: Date;
}

export function validateEmissionRecords(
  input: ValidationEmissionRecord[],
  options: ValidationOptions = {},
): ValidationFinding[] {
  const records = [...input].sort(
    (left, right) => dateValue(left.periodStart) - dateValue(right.periodStart),
  );
  const findings: ValidationFinding[] = [];
  const seenPeriods = new Set<string>();
  const validMonthlyRecords: ValidationEmissionRecord[] = [];
  const now = options.now ?? new Date();

  for (const record of records) {
    const start = dateValue(record.periodStart);
    const end = dateValue(record.periodEnd);
    const periodKey = `${start}:${end}`;

    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
      findings.push({
        type: 'INVALID_PERIOD',
        severity: 'HIGH',
        message: 'The reporting period has invalid or reversed dates.',
        evidence: { recordId: record.id },
      });
      continue;
    }

    if (seenPeriods.has(periodKey)) {
      findings.push({
        type: 'DUPLICATE_PERIOD',
        severity: 'MEDIUM',
        message: 'More than one emission record uses the same reporting period.',
        evidence: { recordId: record.id, periodStart: new Date(start).toISOString() },
      });
    }
    seenPeriods.add(periodKey);

    if (end > now.getTime()) {
      findings.push({
        type: 'FUTURE_PERIOD',
        severity: 'MEDIUM',
        message: 'The reporting period ends in the future.',
        evidence: { recordId: record.id, periodEnd: new Date(end).toISOString() },
      });
    }

    validMonthlyRecords.push(record);
  }

  addMissingPeriodFindings(validMonthlyRecords, findings);

  for (let index = 0; index < validMonthlyRecords.length; index += 1) {
    const current = validMonthlyRecords[index];
    if (!current) continue;

    addFuelMismatchFinding(current, findings);

    const history = validMonthlyRecords.slice(0, index);
    if (history.length >= VALIDATION_TOLERANCES.minimumHistoryRecords) {
      addIntensityFinding(current, history, findings);
      addElectricityFinding(current, history, findings);
    }
  }

  return findings;
}

function addFuelMismatchFinding(
  record: ValidationEmissionRecord,
  findings: ValidationFinding[],
): void {
  if (record.co2Kg === null || record.co2Kg <= 0) return;

  const estimate = estimateFuelDerivedCO2(record.fuelEntries);
  if (estimate === null) return;

  const differencePercent =
    (Math.abs(record.co2Kg - estimate) / record.co2Kg) * 100;
  if (differencePercent < VALIDATION_TOLERANCES.fuelEmissionDifferencePercent) return;

  findings.push({
    type: 'EMISSION_FUEL_MISMATCH',
    severity: differencePercent >= 50 ? 'HIGH' : 'MEDIUM',
    message:
      'Reported CO2 differs from the provisional fuel-derived estimate; this is a data cross-check, not a verified emissions measurement.',
    evidence: {
      recordId: record.id,
      reportedCO2Kg: record.co2Kg,
      estimatedCO2Kg: round(estimate),
      differencePercent: round(differencePercent),
      factorBasis: 'provisional demo/reference factor; source unverified',
    },
  });
}

function estimateFuelDerivedCO2(entries: ValidationFuelEntry[]): number | null {
  let total = 0;
  let supportedEntryCount = 0;

  for (const entry of entries) {
    const factor =
      PROVISIONAL_CO2_FACTORS[
        entry.fuelType as keyof typeof PROVISIONAL_CO2_FACTORS
      ];
    if (!factor || normalizeUnit(entry.unit) !== normalizeUnit(factor.quantityUnit)) continue;

    total += entry.quantity * factor.co2KgPerUnit;
    supportedEntryCount += 1;
  }

  return supportedEntryCount > 0 ? total : null;
}

function addIntensityFinding(
  current: ValidationEmissionRecord,
  history: ValidationEmissionRecord[],
  findings: ValidationFinding[],
): void {
  if (current.co2Kg === null || current.productionVolume <= 0) return;

  const historicalIntensities = history
    .filter((record) => record.co2Kg !== null && record.productionVolume > 0)
    .map((record) => (record.co2Kg as number) / record.productionVolume);
  if (historicalIntensities.length < VALIDATION_TOLERANCES.minimumHistoryRecords) return;
  const historicalMedian = median(historicalIntensities);
  if (historicalMedian === null || historicalMedian === 0) return;

  const currentIntensity = current.co2Kg / current.productionVolume;
  const changePercent =
    (Math.abs(currentIntensity - historicalMedian) / historicalMedian) * 100;
  if (changePercent < VALIDATION_TOLERANCES.intensityChangePercent) return;

  findings.push({
    type: 'EMISSION_INTENSITY_CHANGE',
    severity: changePercent >= 100 ? 'HIGH' : 'MEDIUM',
    message:
      'CO2 per production unit changed substantially compared with the historical median.',
    evidence: {
      recordId: current.id,
      productionUnit: current.productionUnit,
      currentCO2PerProductionUnit: round(currentIntensity),
      historicalMedianCO2PerProductionUnit: round(historicalMedian),
      changePercent: round(changePercent),
    },
  });
}

function addElectricityFinding(
  current: ValidationEmissionRecord,
  history: ValidationEmissionRecord[],
  findings: ValidationFinding[],
): void {
  if (current.electricityKwh <= 0 || current.productionVolume <= 0) return;

  const historicalRatios = history
    .filter((record) => record.electricityKwh > 0 && record.productionVolume > 0)
    .map((record) => record.electricityKwh / record.productionVolume);
  if (historicalRatios.length < VALIDATION_TOLERANCES.minimumHistoryRecords) return;
  const historicalMedian = median(historicalRatios);
  if (historicalMedian === null || historicalMedian === 0) return;

  const currentRatio = current.electricityKwh / current.productionVolume;
  const multiplier = currentRatio / historicalMedian;
  const outsideRange =
    multiplier >= VALIDATION_TOLERANCES.electricityIntensityMultiplier ||
    multiplier <= VALIDATION_TOLERANCES.electricityIntensityMinimumRatio;
  if (!outsideRange) return;

  findings.push({
    type: 'ELECTRICITY_PRODUCTION_MISMATCH',
    severity: multiplier >= 4 || multiplier <= 0.25 ? 'HIGH' : 'MEDIUM',
    message:
      'Electricity per production unit differs substantially from this industry’s historical median.',
    evidence: {
      recordId: current.id,
      currentKwhPerProductionUnit: round(currentRatio),
      historicalMedianKwhPerProductionUnit: round(historicalMedian),
      historicalMultiplier: round(multiplier),
    },
  });
}

function addMissingPeriodFindings(
  records: ValidationEmissionRecord[],
  findings: ValidationFinding[],
): void {
  const monthly = records
    .map((record) => ({ record, month: monthIndex(dateValue(record.periodStart)) }))
    .filter((entry) => Number.isFinite(entry.month))
    .sort((left, right) => left.month - right.month);

  for (let index = 1; index < monthly.length; index += 1) {
    const previous = monthly[index - 1];
    const current = monthly[index];
    if (!previous || !current || current.month <= previous.month + 1) continue;

    findings.push({
      type: 'MISSING_PERIOD',
      severity: 'LOW',
      message: 'One or more monthly reporting periods are missing.',
      evidence: {
        previousPeriodStart: new Date(dateValue(previous.record.periodStart)).toISOString(),
        nextPeriodStart: new Date(dateValue(current.record.periodStart)).toISOString(),
        missingMonthCount: current.month - previous.month - 1,
      },
    });
  }
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

function dateValue(value: Date | string): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function monthIndex(value: number): number {
  const date = new Date(value);
  return date.getUTCFullYear() * 12 + date.getUTCMonth();
}

function normalizeUnit(value: string): string {
  return value.trim().toLowerCase().replace(/s$/, '');
}

function round(value: number): number {
  return Number(value.toFixed(2));
}