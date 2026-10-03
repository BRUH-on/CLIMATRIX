import { prisma } from '../prisma/client';
import type { AuthedUser } from '../middleware/requireAuth';
import { ApiError } from '../utils/ApiError';

/** Returns null for unrestricted admins and an explicit list for other roles. */
export async function getAccessibleIndustryIds(
  user: AuthedUser,
  requestedIndustryId?: string,
): Promise<string[] | null> {
  if (user.role === 'ADMIN') {
    return requestedIndustryId ? [requestedIndustryId] : null;
  }

  if (user.role === 'INDUSTRY') {
    const ownIndustryId = user.industryId;
    if (requestedIndustryId && requestedIndustryId !== ownIndustryId) {
      throw ApiError.forbidden('Cannot access another industry');
    }
    if (!ownIndustryId) {
      if (requestedIndustryId) throw ApiError.forbidden('No industry is assigned to this account');
      return [];
    }
    return [ownIndustryId];
  }

  const assignments = await prisma.inspectorAssignment.findMany({
    where: {
      inspectorId: user.id,
      unassignedAt: null,
      ...(requestedIndustryId ? { industryId: requestedIndustryId } : {}),
    },
    select: { industryId: true },
  });
  const industryIds = assignments.map((assignment) => assignment.industryId);

  if (requestedIndustryId && industryIds.length === 0) {
    throw ApiError.forbidden('Industry is not assigned to this inspector');
  }

  return industryIds;
}

export function assertIndustryInScope(
  industryId: string,
  accessibleIndustryIds: string[] | null,
): void {
  if (accessibleIndustryIds && !accessibleIndustryIds.includes(industryId)) {
    throw ApiError.forbidden('Cannot access another industry');
  }
}