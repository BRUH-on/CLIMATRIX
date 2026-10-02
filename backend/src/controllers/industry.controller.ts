import { asyncHandler } from '../utils/asyncHandler';
import { listIndustries, getIndustry } from '../services/industryReadService';

export const list = asyncHandler(async (req, res) => {
  const industries = await listIndustries(req.user!);
  res.json({
    count: industries.length,
    industries: industries.map(toIndustryDto),
  });
});

export const get = asyncHandler(async (req, res) => {
  const industry = await getIndustry(req.user!, req.params.industryId!);
  res.json({ industry: toIndustryDto(industry) });
});

function toIndustryDto(industry: Awaited<ReturnType<typeof listIndustries>>[number]) {
  const latestEmission = industry.emissionLogs[0] ?? null;
  return {
    id: industry.id,
    name: industry.name,
    sector: industry.sector,
    location: {
      addressLine1: industry.addressLine1,
      city: industry.city,
      state: industry.state,
      country: industry.country,
      latitude: industry.latitude === null ? null : Number(industry.latitude),
      longitude: industry.longitude === null ? null : Number(industry.longitude),
    },
    isActive: industry.isActive,
    status: latestEmission?.overallStatus ?? null,
    summary: {
      emissionLogCount: industry._count.emissionLogs,
      latestEmission: latestEmission
        ? {
            periodStart: latestEmission.periodStart,
            periodEnd: latestEmission.periodEnd,
            recordedAt: latestEmission.recordedAt,
            status: latestEmission.overallStatus,
          }
        : null,
    },
  };
}