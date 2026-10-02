import 'dotenv/config';
import {
  ComplianceStatus,
  FuelType,
  Pollutant,
  PrismaClient,
} from '@prisma/client';
import {
  buildDemoMonthlyRecords,
  DEMO_INDUSTRIES,
} from './demoSeedData';

const prisma = new PrismaClient();
const DEMO_THRESHOLD_START = new Date('2025-10-01T00:00:00.000Z');
const DEMO_THRESHOLD_END = new Date('2026-09-30T23:59:59.999Z');
const DEMO_NOTE = 'DEMO/REFERENCE DATA ONLY; not a verified regulatory limit or measurement.';

async function main(): Promise<void> {
  const submitter = await prisma.user.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (!submitter) {
    throw new Error(
      'No active user exists to associate with demo emission records. Create an authorized user before running this seed.',
    );
  }

  const registrationNumbers = DEMO_INDUSTRIES.map((industry) => industry.registrationNo);
  const existingIndustries = await prisma.industry.findMany({
    where: { registrationNo: { in: registrationNumbers } },
    select: { id: true },
  });
  const existingIndustryIds = existingIndustries.map((industry) => industry.id);

  // This seed owns only the listed demo registrations; unrelated database rows are untouched.
  if (existingIndustryIds.length > 0) {
    await prisma.complianceNotice.deleteMany({
      where: { industryId: { in: existingIndustryIds } },
    });
    await prisma.emissionLog.deleteMany({
      where: { industryId: { in: existingIndustryIds } },
    });
  }

  const seededIndustries = [];
  for (const fixture of DEMO_INDUSTRIES) {
    const data = {
      name: fixture.name,
      sector: fixture.sector,
      contactEmail: fixture.contactEmail,
      addressLine1: fixture.addressLine1,
      city: fixture.city,
      state: fixture.state,
      postalCode: fixture.postalCode,
      country: 'IN',
      latitude: fixture.latitude,
      longitude: fixture.longitude,
      isActive: true,
    };
    const industry = await prisma.industry.upsert({
      where: { registrationNo: fixture.registrationNo },
      update: data,
      create: { registrationNo: fixture.registrationNo, ...data },
    });
    seededIndustries.push({ fixture, industry });
  }

  for (const fixture of DEMO_INDUSTRIES) {
    await prisma.complianceThreshold.upsert({
      where: {
        sector_pollutant_effectiveFrom: {
          sector: fixture.sector,
          pollutant: Pollutant.CO2,
          effectiveFrom: DEMO_THRESHOLD_START,
        },
      },
      update: {
        unit: 'kg/month',
        warningLimit: fixture.warningLimitKg,
        violationLimit: fixture.violationLimitKg,
        effectiveUntil: DEMO_THRESHOLD_END,
        isActive: true,
        notes: DEMO_NOTE,
      },
      create: {
        sector: fixture.sector,
        pollutant: Pollutant.CO2,
        unit: 'kg/month',
        warningLimit: fixture.warningLimitKg,
        violationLimit: fixture.violationLimitKg,
        effectiveFrom: DEMO_THRESHOLD_START,
        effectiveUntil: DEMO_THRESHOLD_END,
        isActive: true,
        notes: DEMO_NOTE,
      },
    });
  }

  let emissionLogCount = 0;
  for (const { fixture, industry } of seededIndustries) {
    for (const record of buildDemoMonthlyRecords(fixture.scenario)) {
      const co2Status = statusForCO2(
        record.co2Kg,
        fixture.warningLimitKg,
        fixture.violationLimitKg,
      );
      await prisma.emissionLog.create({
        data: {
          industryId: industry.id,
          submittedById: submitter.id,
          periodStart: record.periodStart,
          periodEnd: record.periodEnd,
          recordedAt: record.recordedAt,
          electricityKwh: record.electricityKwh,
          productionVolume: record.productionVolume,
          productionUnit: 'tonnes',
          co2Kg: record.co2Kg,
          noxKg: record.noxKg,
          soxKg: record.soxKg,
          pm25Ugm3: record.pm25Ugm3,
          co2Status,
          noxStatus: ComplianceStatus.COMPLIANT,
          soxStatus: ComplianceStatus.COMPLIANT,
          overallStatus: co2Status,
          notes: `${DEMO_NOTE} Scenario: ${fixture.scenario}.`,
          fuelEntries: {
            create: {
              fuelType: FuelType.COAL,
              quantity: record.coalTonnes,
              unit: 'tonne',
            },
          },
        },
      });
      emissionLogCount += 1;
    }
  }

  console.log(
    `Seeded ${seededIndustries.length} demo industries and ${emissionLogCount} monthly emission records.`,
  );
  console.log(
    'All fixture values and thresholds are demo/reference data, not real measurements or legal limits.',
  );
}

function statusForCO2(
  co2Kg: number,
  warningLimitKg: number,
  violationLimitKg: number,
): ComplianceStatus {
  if (co2Kg > violationLimitKg) return ComplianceStatus.VIOLATION;
  if (co2Kg > warningLimitKg) return ComplianceStatus.WARNING;
  return ComplianceStatus.COMPLIANT;
}

main()
  .catch((error) => {
    console.error('[seed-data] Demo seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });