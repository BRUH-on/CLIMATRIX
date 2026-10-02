import type { AuthedUser } from '../middleware/requireAuth';
import { prisma } from '../prisma/client';
import { ApiError } from '../utils/ApiError';
import {
  assessEmissionCompliance,
  type ComplianceAssessment,
  type CompliancePollutant,
} from './analytics/complianceEngine';
import { listEmissionLogs } from './emissionReadService';

export interface ComplianceReadFilters {
  industryId: string;
  pollutant?: CompliancePollutant;
  startDate?: Date;
  endDate?: Date;
  limit: number;
}

export async function getIndustryCompliance(
  user: AuthedUser,
  filters: ComplianceReadFilters,
): Promise<{
  industry: { id: string; name: string; sector: string };
  recordCount: number;
  assessmentCount: number;
  violationCount: number;
  warningCount: number;
  assessments: ComplianceAssessment[];
}> {
  const emissions = await listEmissionLogs(user, {
    industryId: filters.industryId,
    pollutant: filters.pollutant,
    startDate: filters.startDate,
    endDate: filters.endDate,
    limit: filters.limit,
    latestFirst: true,
  });

  const industry = await prisma.industry.findUnique({
    where: { id: filters.industryId },
    select: { id: true, name: true, sector: true },
  });
  if (!industry) throw ApiError.notFound('Industry not found');

  const thresholds = await prisma.complianceThreshold.findMany({
    where: {
      sector: industry.sector,
      isActive: true,
      ...(filters.pollutant ? { pollutant: filters.pollutant } : {}),
    },
    orderBy: { effectiveFrom: 'desc' },
  });

  const orderedEmissions = [...emissions].reverse();
  const assessments = orderedEmissions.flatMap((emission) =>
    assessEmissionCompliance(
      {
        id: emission.id,
        sector: industry.sector,
        periodStart: emission.periodStart,
        periodEnd: emission.periodEnd,
        co2Kg: emission.co2Kg === null ? null : Number(emission.co2Kg),
        noxKg: emission.noxKg === null ? null : Number(emission.noxKg),
        soxKg: emission.soxKg === null ? null : Number(emission.soxKg),
        pm25Ugm3: emission.pm25Ugm3 === null ? null : Number(emission.pm25Ugm3),
      },
      thresholds.map((threshold) => ({
        id: threshold.id,
        sector: threshold.sector,
        pollutant: threshold.pollutant,
        unit: threshold.unit,
        warningLimit: Number(threshold.warningLimit),
        violationLimit: Number(threshold.violationLimit),
        effectiveFrom: threshold.effectiveFrom,
        effectiveUntil: threshold.effectiveUntil,
        notes: threshold.notes,
      })),
      filters.pollutant,
    ),
  );

  return {
    industry,
    recordCount: emissions.length,
    assessmentCount: assessments.length,
    violationCount: assessments.filter((item) => item.status === 'VIOLATION').length,
    warningCount: assessments.filter((item) => item.status === 'WARNING').length,
    assessments,
  };
}