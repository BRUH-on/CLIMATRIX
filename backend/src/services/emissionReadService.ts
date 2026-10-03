import { Prisma } from '@prisma/client';
import { prisma } from '../prisma/client';
import type { AuthedUser } from '../middleware/requireAuth';
import { getAccessibleIndustryIds } from './industryScopeService';

export type EmissionPollutant = 'CO2' | 'NOX' | 'SOX' | 'PM25';

export interface EmissionFilters {
  industryId?: string;
  pollutant?: EmissionPollutant;
  startDate?: Date;
  endDate?: Date;
  limit: number;
  latestFirst?: boolean;
}

export async function listEmissionLogs(user: AuthedUser, filters: EmissionFilters) {
  const accessibleIds = await getAccessibleIndustryIds(user, filters.industryId);
  const where: Prisma.EmissionLogWhereInput = {
    ...(accessibleIds === null ? {} : { industryId: { in: accessibleIds } }),
    ...(filters.startDate ? { periodEnd: { gte: filters.startDate } } : {}),
    ...(filters.endDate ? { periodStart: { lte: filters.endDate } } : {}),
  };

  switch (filters.pollutant) {
    case 'CO2':
      where.co2Kg = { not: null };
      break;
    case 'NOX':
      where.noxKg = { not: null };
      break;
    case 'SOX':
      where.soxKg = { not: null };
      break;
    case 'PM25':
      where.pm25Ugm3 = { not: null };
      break;
  }

  return prisma.emissionLog.findMany({
    where,
    include: {
      industry: {
        select: { id: true, name: true, sector: true, city: true, state: true },
      },
      fuelEntries: {
        select: { fuelType: true, quantity: true, unit: true },
        orderBy: { fuelType: 'asc' },
      },
    },
    orderBy: filters.latestFirst
      ? [{ periodStart: 'desc' }, { recordedAt: 'desc' }]
      : [{ periodStart: 'asc' }, { recordedAt: 'asc' }],
    take: filters.limit,
  });
}