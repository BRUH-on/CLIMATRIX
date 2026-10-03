import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { listEmissionLogs, type EmissionFilters } from '../services/emissionReadService';

const baseQuerySchema = z.object({
  industryId: z.string().min(1).optional(),
  pollutant: z.enum(['CO2', 'NOX', 'SOX', 'PM25']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  limit: z.coerce.number().int().positive().max(500).default(100),
});

const querySchema = baseQuerySchema.refine(
  (query) =>
    !query.startDate || !query.endDate || query.startDate <= query.endDate,
  { message: 'startDate must be on or before endDate' },
);

const industryQuerySchema = baseQuerySchema
  .omit({ industryId: true })
  .refine(
    (query) =>
      !query.startDate || !query.endDate || query.startDate <= query.endDate,
    { message: 'startDate must be on or before endDate' },
  );

export const list = asyncHandler(async (req, res) => {
  const filters = querySchema.parse(req.query) as EmissionFilters;
  const emissions = await listEmissionLogs(req.user!, filters);
  res.json({
    count: emissions.length,
    emissions: emissions.map(toEmissionDto),
  });
});

export const listForIndustry = asyncHandler(async (req, res) => {
  const query = industryQuerySchema.parse(req.query);
  const emissions = await listEmissionLogs(req.user!, {
    ...query,
    industryId: req.params.industryId!,
  });
  res.json({
    count: emissions.length,
    emissions: emissions.map(toEmissionDto),
  });
});

function toEmissionDto(emission: Awaited<ReturnType<typeof listEmissionLogs>>[number]) {
  return {
    id: emission.id,
    industry: emission.industry,
    period: {
      start: emission.periodStart,
      end: emission.periodEnd,
      recordedAt: emission.recordedAt,
    },
    co2Kg: emission.co2Kg === null ? null : Number(emission.co2Kg),
    noxKg: emission.noxKg === null ? null : Number(emission.noxKg),
    soxKg: emission.soxKg === null ? null : Number(emission.soxKg),
    pm25Ugm3: emission.pm25Ugm3 === null ? null : Number(emission.pm25Ugm3),
    co2Status: emission.co2Status,
    noxStatus: emission.noxStatus,
    soxStatus: emission.soxStatus,
    overallStatus: emission.overallStatus,
    electricityKwh: Number(emission.electricityKwh),
    productionVolume: Number(emission.productionVolume),
    productionUnit: emission.productionUnit,
    fuelEntries: emission.fuelEntries.map((entry) => ({
      fuelType: entry.fuelType,
      quantity: Number(entry.quantity),
      unit: entry.unit,
    })),
    notes: emission.notes,
  };
}