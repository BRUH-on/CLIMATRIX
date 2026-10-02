import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '../prisma/client';
import { getAccessibleIndustryIds } from '../services/industryScopeService';
import {
  validateEmissionRecords,
  type ValidationEmissionRecord,
} from '../services/analytics/validationEngine';

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