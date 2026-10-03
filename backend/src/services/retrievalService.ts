import { Prisma } from '@prisma/client';
import type { AuthedUser } from '../middleware/requireAuth';
import { prisma } from '../prisma/client';
import { ApiError } from '../utils/ApiError';
import { getAccessibleIndustryIds } from './industryScopeService';
import { listEmissionLogs } from './emissionReadService';
import { getIndustryCompliance } from './complianceReadService';
import {
  assessEmissionCompliance,
  type ComplianceAssessment,
  type CompliancePollutant,
  type ComplianceThresholdInput,
} from './analytics/complianceEngine';
import {
  detectEmissionAnomalies,
  type AnomalyEmissionRecord,
} from './analytics/anomalyEngine';

export type RetrievalPollutant = CompliancePollutant;
export type RetrievalComplianceStatus = 'COMPLIANT' | 'WARNING' | 'VIOLATION';

interface DateFilters {
  startDate?: Date;
  endDate?: Date;
}

export interface IndustryEmissionsRequest extends DateFilters {
  tool: 'emissions';
  industryId: string;
  pollutant?: RetrievalPollutant;
  limit: number;
}

export interface IndustryComplianceRequest extends DateFilters {
  tool: 'compliance';
  industryId: string;
  pollutant: RetrievalPollutant;
  status?: RetrievalComplianceStatus;
  limit: number;
}

export interface ApplicableThresholdRequest {
  tool: 'threshold';
  industryId: string;
  pollutant: RetrievalPollutant;
  periodStart: Date;
  periodEnd: Date;
}

export interface IndustryAnomaliesRequest {
  tool: 'anomalies';
  industryId: string;
  limit: number;
}

export type RetrievalRequest =
  | IndustryEmissionsRequest
  | IndustryComplianceRequest
  | ApplicableThresholdRequest
  | IndustryAnomaliesRequest;

export type RetrievalStatus =
  | 'SUCCESS'
  | 'NO_DATA'
  | 'NO_APPLICABLE_THRESHOLD'
  | 'INVALID_THRESHOLD'
  | 'UNIT_MISMATCH';

export interface RetrievalResult {
  tool: RetrievalRequest['tool'];
  status: RetrievalStatus;
  data: unknown;
}

const MEASUREMENT_UNITS: Record<RetrievalPollutant, string> = {
  CO2: 'kg',
  NOX: 'kg',
  SOX: 'kg',
  PM25: 'ug/m3',
};

export async function retrieveForUser(
  user: AuthedUser,
  request: RetrievalRequest,
): Promise<RetrievalResult> {
  switch (request.tool) {
    case 'emissions':
      return getIndustryEmissions(user, request);
    case 'compliance':
      return getComplianceStatus(user, request);
    case 'threshold':
      return getApplicableThreshold(user, request);
    case 'anomalies':
      return getIndustryAnomalies(user, request);
  }
}

export async function getIndustryEmissions(
  user: AuthedUser,
  request: IndustryEmissionsRequest,
): Promise<RetrievalResult> {
  const emissions = await listEmissionLogs(user, {
    industryId: request.industryId,
    pollutant: request.pollutant,
    startDate: request.startDate,
    endDate: request.endDate,
    limit: request.limit,
    latestFirst: true,
  });
  const records = emissions.map((emission) => ({
    id: emission.id,
    industry: emission.industry,
    period: {
      start: emission.periodStart,
      end: emission.periodEnd,
      recordedAt: emission.recordedAt,
    },
    co2Kg: numberOrNull(emission.co2Kg),
    noxKg: numberOrNull(emission.noxKg),
    soxKg: numberOrNull(emission.soxKg),
    pm25Ugm3: numberOrNull(emission.pm25Ugm3),
    electricityKwh: Number(emission.electricityKwh),
    productionVolume: Number(emission.productionVolume),
    productionUnit: emission.productionUnit,
    fuelEntries: emission.fuelEntries.map((entry) => ({
      fuelType: entry.fuelType,
      quantity: Number(entry.quantity),
      unit: entry.unit,
    })),
    overallStatus: emission.overallStatus,
  }));

  return {
    tool: request.tool,
    status: records.length ? 'SUCCESS' : 'NO_DATA',
    data: {
      industryId: request.industryId,
      pollutant: request.pollutant ?? null,
      recordCount: records.length,
      records,
    },
  };
}

export async function getComplianceStatus(
  user: AuthedUser,
  request: IndustryComplianceRequest,
): Promise<RetrievalResult> {
  const result = await getIndustryCompliance(user, {
    industryId: request.industryId,
    pollutant: request.pollutant,
    startDate: request.startDate,
    endDate: request.endDate,
    limit: request.limit,
  });
  let assessments: ComplianceAssessment[] = result.assessments;
  if (request.status) {
    assessments = assessments.filter((assessment) => assessment.status === request.status);
  }

  const unavailableStatuses = new Set(assessments.map((item) => item.status));
  let status: RetrievalStatus = assessments.length ? 'SUCCESS' : 'NO_DATA';
  if (assessments.length && [...unavailableStatuses].every((item) => item === 'NO_THRESHOLD')) {
    status = 'NO_APPLICABLE_THRESHOLD';
  } else if (
    assessments.length &&
    [...unavailableStatuses].every((item) => item === 'INCOMPATIBLE_THRESHOLD_UNIT')
  ) {
    status = 'UNIT_MISMATCH';
  } else if (
    assessments.length &&
    [...unavailableStatuses].every((item) => item === 'INVALID_THRESHOLD')
  ) {
    status = 'INVALID_THRESHOLD';
  }

  return {
    tool: request.tool,
    status,
    data: {
      industry: result.industry,
      pollutant: request.pollutant,
      recordCount: result.recordCount,
      assessmentCount: assessments.length,
      warningCount: assessments.filter((item) => item.status === 'WARNING').length,
      violationCount: assessments.filter((item) => item.status === 'VIOLATION').length,
      assessments,
    },
  };
}

export async function getApplicableThreshold(
  user: AuthedUser,
  request: ApplicableThresholdRequest,
): Promise<RetrievalResult> {
  await getAccessibleIndustryIds(user, request.industryId);
  const industry = await prisma.industry.findUnique({
    where: { id: request.industryId },
    select: { id: true, name: true, sector: true },
  });
  if (!industry) throw ApiError.notFound('Industry not found');

  const thresholds = await prisma.complianceThreshold.findMany({
    where: {
      sector: industry.sector,
      pollutant: request.pollutant,
      isActive: true,
      effectiveFrom: { lte: request.periodStart },
      OR: [
        { effectiveUntil: null },
        { effectiveUntil: { gte: request.periodEnd } },
      ],
    },
    orderBy: { effectiveFrom: 'desc' },
    take: 1,
  });
  const threshold = thresholds[0];

  if (!threshold) {
    return {
      tool: request.tool,
      status: 'NO_APPLICABLE_THRESHOLD',
      data: {
        industry,
        pollutant: request.pollutant,
        period: { start: request.periodStart, end: request.periodEnd },
        threshold: null,
      },
    };
  }

  const assessment = assessEmissionCompliance(
    thresholdProbe(industry.sector, request),
    [toThresholdInput(threshold)],
    request.pollutant,
  )[0];
  const thresholdStatus =
    assessment?.status === 'INVALID_THRESHOLD'
      ? 'INVALID_THRESHOLD'
      : assessment?.status === 'INCOMPATIBLE_THRESHOLD_UNIT'
        ? 'UNIT_MISMATCH'
        : 'SUCCESS';

  return {
    tool: request.tool,
    status: thresholdStatus,
    data: {
      industry,
      pollutant: request.pollutant,
      period: { start: request.periodStart, end: request.periodEnd },
      threshold: {
        id: threshold.id,
        unit: threshold.unit,
        warningLimit: Number(threshold.warningLimit),
        violationLimit: Number(threshold.violationLimit),
        effectiveFrom: threshold.effectiveFrom,
        effectiveUntil: threshold.effectiveUntil,
        notes: threshold.notes,
      },
    },
  };
}

export async function getIndustryAnomalies(
  user: AuthedUser,
  request: IndustryAnomaliesRequest,
): Promise<RetrievalResult> {
  const emissions = await listEmissionLogs(user, {
    industryId: request.industryId,
    limit: request.limit,
    latestFirst: true,
  });
  const records: AnomalyEmissionRecord[] = [...emissions].reverse().map((emission) => ({
    id: emission.id,
    periodStart: emission.periodStart,
    periodEnd: emission.periodEnd,
    co2Kg: numberOrNull(emission.co2Kg),
    electricityKwh: Number(emission.electricityKwh),
    productionVolume: Number(emission.productionVolume),
    productionUnit: emission.productionUnit,
    fuelEntries: emission.fuelEntries.map((entry) => ({
      fuelType: entry.fuelType,
      quantity: Number(entry.quantity),
      unit: entry.unit,
    })),
  }));
  const anomalies = detectEmissionAnomalies(records);

  return {
    tool: request.tool,
    status: records.length ? 'SUCCESS' : 'NO_DATA',
    data: {
      industryId: request.industryId,
      recordCount: records.length,
      anomalyCount: anomalies.length,
      anomalies,
    },
  };
}

function thresholdProbe(
  sector: string,
  request: ApplicableThresholdRequest,
) {
  return {
    id: 'threshold-validation-probe',
    sector,
    periodStart: request.periodStart,
    periodEnd: request.periodEnd,
    co2Kg: request.pollutant === 'CO2' ? 0 : null,
    noxKg: request.pollutant === 'NOX' ? 0 : null,
    soxKg: request.pollutant === 'SOX' ? 0 : null,
    pm25Ugm3: request.pollutant === 'PM25' ? 0 : null,
  };
}

function toThresholdInput(threshold: {
  id: string;
  sector: string;
  pollutant: string;
  unit: string;
  warningLimit: Prisma.Decimal;
  violationLimit: Prisma.Decimal;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
  notes: string | null;
}): ComplianceThresholdInput {
  return {
    id: threshold.id,
    sector: threshold.sector,
    pollutant: threshold.pollutant,
    unit: threshold.unit,
    warningLimit: Number(threshold.warningLimit.toString()),
    violationLimit: Number(threshold.violationLimit.toString()),
    effectiveFrom: threshold.effectiveFrom,
    effectiveUntil: threshold.effectiveUntil,
    notes: threshold.notes,
  };
}

function numberOrNull(value: Prisma.Decimal | null): number | null {
  return value === null ? null : Number(value.toString());
}