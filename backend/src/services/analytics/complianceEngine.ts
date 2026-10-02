export type CompliancePollutant = 'CO2' | 'NOX' | 'SOX' | 'PM25';
export type ComplianceResultStatus =
  | 'COMPLIANT'
  | 'WARNING'
  | 'VIOLATION'
  | 'NO_THRESHOLD'
  | 'INCOMPATIBLE_THRESHOLD_UNIT'
  | 'INVALID_THRESHOLD';

export interface ComplianceThresholdInput {
  id: string;
  sector: string;
  pollutant: string;
  unit: string;
  warningLimit: number;
  violationLimit: number;
  effectiveFrom: Date | string;
  effectiveUntil: Date | string | null;
  notes: string | null;
}

export interface ComplianceEmissionInput {
  id: string;
  sector: string;
  periodStart: Date | string;
  periodEnd: Date | string;
  co2Kg: number | null;
  noxKg: number | null;
  soxKg: number | null;
  pm25Ugm3: number | null;
}

export interface ComplianceAssessment {
  emissionLogId: string;
  pollutant: CompliancePollutant;
  period: { start: string; end: string };
  status: ComplianceResultStatus;
  observedValue: number;
  measurementUnit: string;
  warningLimit: number | null;
  violationLimit: number | null;
  thresholdUnit: string | null;
  exceedanceAmount: number | null;
  exceedancePercent: number | null;
  requiredReduction: number | null;
  requiredReductionTarget: number | null;
  thresholdNotes: string | null;
  explanation: string;
}

const METRICS: Array<{
  pollutant: CompliancePollutant;
  field: 'co2Kg' | 'noxKg' | 'soxKg' | 'pm25Ugm3';
  measurementUnit: string;
  acceptedThresholdUnits: string[];
}> = [
  { pollutant: 'CO2', field: 'co2Kg', measurementUnit: 'kg', acceptedThresholdUnits: ['kg/month'] },
  { pollutant: 'NOX', field: 'noxKg', measurementUnit: 'kg', acceptedThresholdUnits: ['kg/month'] },
  { pollutant: 'SOX', field: 'soxKg', measurementUnit: 'kg', acceptedThresholdUnits: ['kg/month'] },
  {
    pollutant: 'PM25',
    field: 'pm25Ugm3',
    measurementUnit: 'ug/m3',
    acceptedThresholdUnits: ['ug/m3'],
  },
];

export function assessEmissionCompliance(
  emission: ComplianceEmissionInput,
  thresholds: ComplianceThresholdInput[],
  pollutantFilter?: CompliancePollutant,
): ComplianceAssessment[] {
  return METRICS.filter(
    (metric) => !pollutantFilter || metric.pollutant === pollutantFilter,
  ).flatMap((metric) => {
    const observedValue = emission[metric.field];
    if (observedValue === null) return [];

    const applicable = thresholds
      .filter(
        (threshold) =>
          threshold.sector === emission.sector &&
          threshold.pollutant === metric.pollutant &&
          coversPeriod(threshold, emission.periodStart, emission.periodEnd),
      )
      .sort(
        (left, right) =>
          dateValue(right.effectiveFrom) - dateValue(left.effectiveFrom),
      )[0];

    if (!applicable) {
      return [
        baseAssessment(emission, metric.pollutant, observedValue, metric.measurementUnit, {
          status: 'NO_THRESHOLD',
          explanation: `No stored ${metric.pollutant} threshold covers this reporting period.`,
        }),
      ];
    }

    if (!metric.acceptedThresholdUnits.includes(normalizeUnit(applicable.unit))) {
      return [
        baseAssessment(emission, metric.pollutant, observedValue, metric.measurementUnit, {
          status: 'INCOMPATIBLE_THRESHOLD_UNIT',
          thresholdUnit: applicable.unit,
          explanation: `The stored ${metric.pollutant} threshold unit (${applicable.unit}) does not match the recorded measurement unit (${metric.measurementUnit}).`,
        }),
      ];
    }

    if (
      applicable.warningLimit < 0 ||
      applicable.violationLimit <= 0 ||
      applicable.warningLimit > applicable.violationLimit
    ) {
      return [
        baseAssessment(emission, metric.pollutant, observedValue, metric.measurementUnit, {
          status: 'INVALID_THRESHOLD',
          thresholdUnit: applicable.unit,
          explanation: `The stored ${metric.pollutant} warning and violation limits are not valid for calculation.`,
        }),
      ];
    }

    const status =
      observedValue > applicable.violationLimit
        ? 'VIOLATION'
        : observedValue > applicable.warningLimit
          ? 'WARNING'
          : 'COMPLIANT';
    const exceedanceAmount = Math.max(0, observedValue - applicable.violationLimit);
    const exceedancePercent =
      exceedanceAmount === 0
        ? 0
        : (exceedanceAmount / applicable.violationLimit) * 100;
    const requiredReduction = Math.max(0, observedValue - applicable.warningLimit);

    let explanation: string;
    if (status === 'VIOLATION') {
      explanation = `${metric.pollutant} was ${format(observedValue)} ${metric.measurementUnit} against the stored violation limit of ${format(applicable.violationLimit)} ${applicable.unit}, exceeding it by ${format(exceedanceAmount)} ${metric.measurementUnit} (${format(exceedancePercent)}%). Reduce by ${format(requiredReduction)} ${metric.measurementUnit} to reach the stored warning limit and return to the compliant range.`;
    } else if (status === 'WARNING') {
      explanation = `${metric.pollutant} was ${format(observedValue)} ${metric.measurementUnit}, above the stored warning limit of ${format(applicable.warningLimit)} ${applicable.unit} but within the violation limit of ${format(applicable.violationLimit)} ${applicable.unit}. Reduce by ${format(requiredReduction)} ${metric.measurementUnit} to reach the compliant range.`;
    } else {
      explanation = `${metric.pollutant} was ${format(observedValue)} ${metric.measurementUnit}, within the stored warning and violation limits.`;
    }

    return [
      baseAssessment(emission, metric.pollutant, observedValue, metric.measurementUnit, {
        status,
        warningLimit: applicable.warningLimit,
        violationLimit: applicable.violationLimit,
        thresholdUnit: applicable.unit,
        exceedanceAmount,
        exceedancePercent: round(exceedancePercent),
        requiredReduction: round(requiredReduction),
        requiredReductionTarget: applicable.warningLimit,
        thresholdNotes: applicable.notes,
        explanation,
      }),
    ];
  });
}

function baseAssessment(
  emission: ComplianceEmissionInput,
  pollutant: CompliancePollutant,
  observedValue: number,
  measurementUnit: string,
  result: Partial<ComplianceAssessment> & {
    status: ComplianceResultStatus;
    explanation: string;
  },
): ComplianceAssessment {
  return {
    emissionLogId: emission.id,
    pollutant,
    period: {
      start: dateOnly(emission.periodStart),
      end: dateOnly(emission.periodEnd),
    },
    status: result.status,
    observedValue: round(observedValue),
    measurementUnit,
    warningLimit: result.warningLimit ?? null,
    violationLimit: result.violationLimit ?? null,
    thresholdUnit: result.thresholdUnit ?? null,
    exceedanceAmount: result.exceedanceAmount ?? null,
    exceedancePercent: result.exceedancePercent ?? null,
    requiredReduction: result.requiredReduction ?? null,
    requiredReductionTarget: result.requiredReductionTarget ?? null,
    thresholdNotes: result.thresholdNotes ?? null,
    explanation: result.explanation,
  };
}

function coversPeriod(
  threshold: ComplianceThresholdInput,
  periodStart: Date | string,
  periodEnd: Date | string,
): boolean {
  const start = dateValue(periodStart);
  const end = dateValue(periodEnd);
  const effectiveStart = dateValue(threshold.effectiveFrom);
  const effectiveEnd = threshold.effectiveUntil
    ? dateValue(threshold.effectiveUntil)
    : Number.POSITIVE_INFINITY;
  return effectiveStart <= start && effectiveEnd >= end;
}

function dateValue(value: Date | string): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function dateOnly(value: Date | string): string {
  return new Date(value).toISOString().slice(0, 10);
}

function normalizeUnit(value: string): string {
  return value.trim().toLowerCase().replace(/µ/g, 'u').replace(/³/g, '3').replace(/\s+/g, '');
}

function format(value: number): string {
  return Number(value.toFixed(2)).toLocaleString('en-US');
}

function round(value: number): number {
  return Number(value.toFixed(2));
}