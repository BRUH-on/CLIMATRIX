import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

router.get("/heatmap", async (_req, res, next) => {
  try {
    const industries = await prisma.industry.findMany({
      where: {
        isActive: true,
        latitude: { not: null },
        longitude: { not: null },
      },
      include: {
        emissionLogs: {
          orderBy: {
            recordedAt: "desc",
          },
          take: 1,
        },
      },
    });

    const data = industries.map((industry: any) => {
      const latestLog = industry.emissionLogs[0];

      let color: "GREEN" | "YELLOW" | "RED" = "GREEN";

      if (latestLog?.overallStatus === "WARNING") {
        color = "YELLOW";
      }

      if (latestLog?.overallStatus === "VIOLATION") {
        color = "RED";
      }

      return {
        industryId: industry.id,
        name: industry.name,
        sector: industry.sector,
        city: industry.city,
        state: industry.state,
        latitude: Number(industry.latitude),
        longitude: Number(industry.longitude),
        status: latestLog?.overallStatus ?? "COMPLIANT",
        color,
        lastRecordedAt: latestLog?.recordedAt ?? null,
      };
    });

    res.json({
      count: data.length,
      data,
    });
  } catch (error) {
    next(error);
  }
});

export default router;