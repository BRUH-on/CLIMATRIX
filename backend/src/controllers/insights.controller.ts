import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../prisma/client';
import { getAccessibleIndustryIds } from '../services/industryScopeService';
import {
  validateEmissionRecords,
  type ValidationEmissionRecord,
} from '../services/analytics/validationEngine';
import { ANOMALY_THRESHOLDS } from '../constants/anomalyThresholds';
import { detectEmissionAnomalies } from '../services/analytics/anomalyEngine';
import { listEmissionLogs } from '../services/emissionReadService';
import {
  getIndustryCompliance,
} from '../services/complianceReadService';
import type { CompliancePollutant } from '../services/analytics/complianceEngine';

const validationQuerySchema = z.object({ industryId: z.string().min(1) });

export const validateIndustry = asyncHandler(async (req, res) => {
  const { industryId } = validationQuerySchema.parse(req.query);
  const accessibleIds = await getAccessibleIndustryIds(req.user!, industryId);
  const industry = await prisma.industry.findFirst({
    where: {
      id: industryId,
      ...(accessibleIds === null ? {} : { id: { in: accessibleIds } }),
    },
    select: { id: true },
  });

  if (!industry) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Industry not found' } });
    return;
  }

  const logs = await prisma.emissionLog.findMany({
    where: { industryId },
    include: { fuelEntries: { select: { fuelType: true, quantity: true, unit: true } } },
    orderBy: [{ periodStart: 'asc' }, { recordedAt: 'asc' }],
    take: 1000,
  });
  const records: ValidationEmissionRecord[] = logs.map((log) => ({
    id: log.id,
    periodStart: log.periodStart,
    periodEnd: log.periodEnd,
    co2Kg: log.co2Kg === null ? null : Number(log.co2Kg),
    electricityKwh: Number(log.electricityKwh),
    productionVolume: Number(log.productionVolume),
    productionUnit: log.productionUnit,
    fuelEntries: log.fuelEntries.map((entry) => ({
      fuelType: entry.fuelType,
      quantity: Number(entry.quantity),
      unit: entry.unit,
    })),
  }));
  const findings = validateEmissionRecords(records);

  res.json({
    industryId,
    findingCount: findings.length,
    findings,
    factorNotice:
      'Fuel-derived CO2 checks use provisional demo/reference factors whose source has not been verified.',
  });
});

const anomalyQuerySchema = z.object({ industryId: z.string().min(1) });

export const getIndustryAnomalies = asyncHandler(async (req, res) => {
  const { industryId } = anomalyQuerySchema.parse(req.query);
  const emissions = await listEmissionLogs(req.user!, {
    industryId,
    limit: 500,
    latestFirst: true,
  });
  const industry = await prisma.industry.findUnique({
    where: { id: industryId },
    select: { id: true, name: true },
  });

  if (!industry) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Industry not found' } });
    return;
  }

  const records: ValidationEmissionRecord[] = emissions.reverse().map((log) => ({
    id: log.id,
    periodStart: log.periodStart,
    periodEnd: log.periodEnd,
    co2Kg: log.co2Kg === null ? null : Number(log.co2Kg),
    electricityKwh: Number(log.electricityKwh),
    productionVolume: Number(log.productionVolume),
    productionUnit: log.productionUnit,
    fuelEntries: log.fuelEntries.map((entry) => ({
      fuelType: entry.fuelType,
      quantity: Number(entry.quantity),
      unit: entry.unit,
    })),
  }));
  const anomalies = detectEmissionAnomalies(records);
  const usableCO2Records = records.filter(
    (record) => record.co2Kg !== null && record.co2Kg > 0,
  ).length;

  res.json({
    industry,
    recordCount: records.length,
    analysisStatus:
      usableCO2Records > ANOMALY_THRESHOLDS.minimumHistoryRecords
        ? 'COMPLETE'
        : 'INSUFFICIENT_HISTORY',
    anomalyCount: anomalies.length,
    minimumHistoryRecords: ANOMALY_THRESHOLDS.minimumHistoryRecords,
    anomalies,
  });
});

const complianceQuerySchema = z
  .object({
    industryId: z.string().min(1),
    pollutant: z.enum(['CO2', 'NOX', 'SOX', 'PM25']).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    limit: z.coerce.number().int().positive().max(500).default(100),
  })
  .refine(
    (query) =>
      !query.startDate || !query.endDate || query.startDate <= query.endDate,
    { message: 'startDate must be on or before endDate' },
  );

export const getIndustryComplianceAssessments = asyncHandler(async (req, res) => {
  const query = complianceQuerySchema.parse(req.query);
  const result = await getIndustryCompliance(req.user!, {
    ...query,
    pollutant: query.pollutant as CompliancePollutant | undefined,
  });
  res.json(result);
});