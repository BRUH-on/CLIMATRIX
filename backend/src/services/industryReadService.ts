import { prisma } from '../prisma/client';
import type { AuthedUser } from '../middleware/requireAuth';
import { ApiError } from '../utils/ApiError';
import { getAccessibleIndustryIds } from './industryScopeService';

const industrySummarySelect = {
  id: true,
  name: true,
  sector: true,
  city: true,
  state: true,
  country: true,
  addressLine1: true,
  latitude: true,
  longitude: true,
  isActive: true,
  _count: { select: { emissionLogs: true } },
  emissionLogs: {
    select: { overallStatus: true, periodStart: true, periodEnd: true, recordedAt: true },
    orderBy: { periodEnd: 'desc' as const },
    take: 1,
  },
};

export async function listIndustries(user: AuthedUser) {
  const accessibleIds = await getAccessibleIndustryIds(user);
  return prisma.industry.findMany({
    where: accessibleIds === null ? {} : { id: { in: accessibleIds } },
    select: industrySummarySelect,
    orderBy: { name: 'asc' },
  });
}

export async function getIndustry(user: AuthedUser, industryId: string) {
  const accessibleIds = await getAccessibleIndustryIds(user, industryId);
  const industry = await prisma.industry.findFirst({
    where: {
      id: industryId,
      ...(accessibleIds === null ? {} : { id: { in: accessibleIds } }),
    },
    select: industrySummarySelect,
  });

  if (!industry) throw ApiError.notFound('Industry not found');
  return industry;
}