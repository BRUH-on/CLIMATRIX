/**
 * Sample data seed for ClimaCore - populates industries, emission logs,
 * compliance notices, and air quality readings for PDF report generation.
 *
 * Run with: npx tsx prisma/seed-data.ts
 */
import { PrismaClient, IndustrySector, ComplianceStatus, NoticeSeverity, NoticeStatus, FuelType, Pollutant } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Generate dates for the last 12 months
function generateDates() {
  const dates = [];
  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 15);
    const periodStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const periodEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    dates.push({
      recordedAt: date,
      periodStart,
      periodEnd,
      monthName: date.toLocaleString('default', { month: 'short', year: 'numeric' })
    });
  }

  return dates;
}

async function main() {
  console.log('[seed-data] Starting sample data population...');

  // Create demo users (INSPECTOR and INDUSTRY roles)
  const inspectorPassword = await bcrypt.hash('Inspector123', 10);
  const industryPassword = await bcrypt.hash('Industry123', 10);

  const inspectorUser = await prisma.user.upsert({
    where: { email: 'inspector@climacore.local' },
    update: { passwordHash: inspectorPassword, fullName: 'Environmental Inspector', role: 'INSPECTOR', isActive: true },
    create: {
      email: 'inspector@climacore.local',
      passwordHash: inspectorPassword,
      fullName: 'Environmental Inspector',
      role: 'INSPECTOR',
      phone: '+91 9876543210'
    }
  });

  console.log(`[seed-data] Inspector user created: ${inspectorUser.email}`);

  // Create sample industries
  const industries = [
    {
      name: 'Mumbai Steel Works Ltd.',
      registrationNo: 'STEEL-MUM-001',
      sector: IndustrySector.STEEL,
      contactEmail: 'steel.mumbai@example.com',
      contactPhone: '+91 22 12345678',
      addressLine1: 'Plot No. 12, MIDC Industrial Area',
      addressLine2: 'Taloja, Panvel',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '410208',
      country: 'IN',
      latitude: 19.0760,
      longitude: 72.8777
    },
    {
      name: 'Delhi Power Generation Co.',
      registrationNo: 'POWER-DEL-002',
      sector: IndustrySector.POWER,
      contactEmail: 'power.delhi@example.com',
      contactPhone: '+91 11 23456789',
      addressLine1: 'Sector 62, Noida',
      addressLine2: 'Near Okhla Industrial Area',
      city: 'Delhi',
      state: 'Delhi',
      postalCode: '110020',
      country: 'IN',
      latitude: 28.6139,
      longitude: 77.2090
    },
    {
      name: 'Chennai Chemical Industries',
      registrationNo: 'CHEM-CHN-003',
      sector: IndustrySector.CHEMICAL,
      contactEmail: 'chem.chennai@example.com',
      contactPhone: '+91 44 34567890',
      addressLine1: 'SIPCOT Industrial Complex',
      addressLine2: 'Manali, Chennai',
      city: 'Chennai',
      state: 'Tamil Nadu',
      postalCode: '600068',
      country: 'IN',
      latitude: 13.0827,
      longitude: 80.2707
    },
    {
      name: 'Kolkata Refinery Pvt. Ltd.',
      registrationNo: 'REFINE-KOL-004',
      sector: IndustrySector.REFINING,
      contactEmail: 'refinery.kolkata@example.com',
      contactPhone: '+91 33 45678901',
      addressLine1: 'Haldia Industrial Area',
      addressLine2: 'Purba Medinipur',
      city: 'Kolkata',
      state: 'West Bengal',
      postalCode: '721657',
      country: 'IN',
      latitude: 22.5726,
      longitude: 88.3639
    },
    {
      name: 'Bangalore Cement Corp.',
      registrationNo: 'CEMENT-BLR-005',
      sector: IndustrySector.CEMENT,
      contactEmail: 'cement.bangalore@example.com',
      contactPhone: '+91 80 56789012',
      addressLine1: 'Industrial Estate, Peenya',
      addressLine2: '2nd Stage',
      city: 'Bangalore',
      state: 'Karnataka',
      postalCode: '560058',
      country: 'IN',
      latitude: 12.9716,
      longitude: 77.5946
    }
  ];

  const createdIndustries = [];
  for (const industryData of industries) {
    const industry = await prisma.industry.upsert({
      where: { registrationNo: industryData.registrationNo },
      update: industryData,
      create: industryData
    });
    createdIndustries.push(industry);
    console.log(`[seed-data] Industry created: ${industry.name} (${industry.sector})`);
  }

  // Create industry user for the first industry
  const industryUser = await prisma.user.upsert({
    where: { email: 'industry@climacore.local' },
    update: {
      passwordHash: industryPassword,
      fullName: 'Industry Manager',
      role: 'INDUSTRY',
      isActive: true,
      industryId: createdIndustries[0].id
    },
    create: {
      email: 'industry@climacore.local',
      passwordHash: industryPassword,
      fullName: 'Industry Manager',
      role: 'INDUSTRY',
      phone: '+91 9876543211',
      industryId: createdIndustries[0].id
    }
  });

  console.log(`[seed-data] Industry user created: ${industryUser.email} for ${createdIndustries[0].name}`);

  // Create inspector assignments
  for (const industry of createdIndustries) {
    await prisma.inspectorAssignment.upsert({
      where: {
        inspectorId_industryId: {
          inspectorId: inspectorUser.id,
          industryId: industry.id
        }
      },
      update: { unassignedAt: null },
      create: {
        inspectorId: inspectorUser.id,
        industryId: industry.id
      }
    });
  }
  console.log('[seed-data] Inspector assignments created');

  // Create compliance thresholds
  const thresholds = [
    { sector: IndustrySector.STEEL, pollutant: Pollutant.CO2, unit: 'kg/month', warningLimit: 50000, violationLimit: 75000 },
    { sector: IndustrySector.STEEL, pollutant: Pollutant.NOX, unit: 'kg/month', warningLimit: 1500, violationLimit: 2500 },
    { sector: IndustrySector.STEEL, pollutant: Pollutant.SOX, unit: 'kg/month', warningLimit: 800, violationLimit: 1500 },
    { sector: IndustrySector.POWER, pollutant: Pollutant.CO2, unit: 'kg/month', warningLimit: 100000, violationLimit: 150000 },
    { sector: IndustrySector.POWER, pollutant: Pollutant.NOX, unit: 'kg/month', warningLimit: 3000, violationLimit: 5000 },
    { sector: IndustrySector.CHEMICAL, pollutant: Pollutant.CO2, unit: 'kg/month', warningLimit: 40000, violationLimit: 60000 },
    { sector: IndustrySector.REFINING, pollutant: Pollutant.CO2, unit: 'kg/month', warningLimit: 80000, violationLimit: 120000 },
    { sector: IndustrySector.CEMENT, pollutant: Pollutant.CO2, unit: 'kg/month', warningLimit: 60000, violationLimit: 90000 },
  ];

  for (const threshold of thresholds) {
    await prisma.complianceThreshold.upsert({
      where: {
        sector_pollutant_effectiveFrom: {
          sector: threshold.sector,
          pollutant: threshold.pollutant,
          effectiveFrom: new Date('2024-01-01')
        }
      },
      update: threshold,
      create: {
        ...threshold,
        effectiveFrom: new Date('2024-01-01'),
        notes: `Standard limit for ${threshold.sector} sector`
      }
    });
  }
  console.log('[seed-data] Compliance thresholds created');

  // Generate dates for the last 12 months
  const dates = generateDates();

  // Create emission logs for each industry for the last 12 months
  console.log('[seed-data] Creating emission logs...');
  let emissionLogCount = 0;

  for (const industry of createdIndustries) {
    for (const dateInfo of dates) {
      // Generate realistic emission values based on industry sector
      let baseCO2, baseNOX, baseSOX;

      switch (industry.sector) {
        case IndustrySector.POWER:
          baseCO2 = 85000 + Math.random() * 30000;
          baseNOX = 2500 + Math.random() * 1500;
          baseSOX = 800 + Math.random() * 700;
          break;
        case IndustrySector.STEEL:
          baseCO2 = 45000 + Math.random() * 20000;
          baseNOX = 1200 + Math.random() * 800;
          baseSOX = 600 + Math.random() * 400;
          break;
        case IndustrySector.CEMENT:
          baseCO2 = 55000 + Math.random() * 25000;
          baseNOX = 1000 + Math.random() * 600;
          baseSOX = 500 + Math.random() * 300;
          break;
        case IndustrySector.CHEMICAL:
          baseCO2 = 35000 + Math.random() * 15000;
          baseNOX = 800 + Math.random() * 400;
          baseSOX = 300 + Math.random() * 200;
          break;
        case IndustrySector.REFINING:
          baseCO2 = 70000 + Math.random() * 30000;
          baseNOX = 2000 + Math.random() * 1000;
          baseSOX = 700 + Math.random() * 500;
          break;
        default:
          baseCO2 = 30000 + Math.random() * 15000;
          baseNOX = 600 + Math.random() * 400;
          baseSOX = 200 + Math.random() * 150;
      }

      // Add some variation month-to-month
      const variation = 0.8 + Math.random() * 0.4;
      const co2Kg = Math.round(baseCO2 * variation);
      const noxKg = Math.round(baseNOX * variation);
      const soxKg = Math.round(baseSOX * variation);

      // Determine compliance status
      let overallStatus = ComplianceStatus.COMPLIANT;
      if (co2Kg > 75000 || noxKg > 2500 || soxKg > 1500) {
        overallStatus = Math.random() > 0.3 ? ComplianceStatus.WARNING : ComplianceStatus.VIOLATION;
      } else if (co2Kg > 50000 || noxKg > 1500 || soxKg > 800) {
        overallStatus = Math.random() > 0.7 ? ComplianceStatus.WARNING : ComplianceStatus.COMPLIANT;
      }

      const emissionLog = await prisma.emissionLog.create({
        data: {
          industryId: industry.id,
          submittedById: industryUser.id,
          periodStart: dateInfo.periodStart,
          periodEnd: dateInfo.periodEnd,
          recordedAt: dateInfo.recordedAt,
          electricityKwh: Math.round(50000 + Math.random() * 100000),
          productionVolume: Math.round(1000 + Math.random() * 5000),
          productionUnit: 'TONS',
          co2Kg,
          noxKg,
          soxKg,
          pm25Ugm3: 25 + Math.random() * 50,
          co2Status: co2Kg > 75000 ? ComplianceStatus.VIOLATION : (co2Kg > 50000 ? ComplianceStatus.WARNING : ComplianceStatus.COMPLIANT),
          noxStatus: noxKg > 2500 ? ComplianceStatus.VIOLATION : (noxKg > 1500 ? ComplianceStatus.WARNING : ComplianceStatus.COMPLIANT),
          soxStatus: soxKg > 1500 ? ComplianceStatus.VIOLATION : (soxKg > 800 ? ComplianceStatus.WARNING : ComplianceStatus.COMPLIANT),
          overallStatus,
          notes: `Monthly report for ${dateInfo.monthName}`
        }
      });

      // Create fuel consumption entries
      const fuelTypes = [FuelType.COAL, FuelType.DIESEL, FuelType.NATURAL_GAS, FuelType.ELECTRICITY_GRID];
      for (const fuelType of fuelTypes) {
        await prisma.fuelConsumption.create({
          data: {
            emissionLogId: emissionLog.id,
            fuelType,
            quantity: Math.round(1000 + Math.random() * 5000),
            unit: fuelType === FuelType.ELECTRICITY_GRID ? 'kWh' : 'kg'
          }
        });
      }

      emissionLogCount++;
    }
  }
  console.log(`[seed-data] Created ${emissionLogCount} emission logs`);

  // Create compliance notices for some violation cases
  console.log('[seed-data] Creating compliance notices...');

  // Get some emission logs with violations
  const violationLogs = await prisma.emissionLog.findMany({
    where: { overallStatus: ComplianceStatus.VIOLATION },
    take: 3
  });

  for (let i = 0; i < violationLogs.length; i++) {
    const log = violationLogs[i];
    const noticeNumber = `CC-2026-${String(1000 + i).padStart(6, '0')}`;

    await prisma.complianceNotice.create({
      data: {
        noticeNumber,
        industryId: log.industryId,
        emissionLogId: log.id,
        issuedById: inspectorUser.id,
        status: NoticeStatus.ISSUED,
        severity: Math.random() > 0.5 ? NoticeSeverity.WARNING : NoticeSeverity.CRITICAL,
        breachedPollutants: [Pollutant.CO2, Pollutant.NOX, Pollutant.SOX].filter(() => Math.random() > 0.3),
        summary: `Exceeded permissible limits for ${log.overallStatus === 'VIOLATION' ? 'multiple pollutants' : 'primary pollutants'} during ${log.periodStart.toLocaleDateString()}`,
        legalReference: 'Air (Prevention and Control of Pollution) Act, 1981 §21',
        issuedAt: new Date(log.recordedAt.getTime() + 86400000 * 7), // 7 days after log
        dueBy: new Date(log.recordedAt.getTime() + 86400000 * 30) // 30 days after log
      }
    });
  }
  console.log(`[seed-data] Created ${violationLogs.length} compliance notices`);

  // Create air quality readings for major cities
  console.log('[seed-data] Creating air quality readings...');

  const cities = [
    { name: 'Mumbai', lat: 19.0760, lon: 72.8777 },
    { name: 'Delhi', lat: 28.6139, lon: 77.2090 },
    { name: 'Chennai', lat: 13.0827, lon: 80.2707 },
    { name: 'Kolkata', lat: 22.5726, lon: 88.3639 },
    { name: 'Bangalore', lat: 12.9716, lon: 77.5946 },
    { name: 'Hyderabad', lat: 17.3850, lon: 78.4867 },
    { name: 'Ahmedabad', lat: 23.0225, lon: 72.5714 },
    { name: 'Pune', lat: 18.5204, lon: 73.8567 }
  ];

  const parameters = [
    { param: 'pm25', unit: 'µg/m³', range: [30, 180] },
    { param: 'pm10', unit: 'µg/m³', range: [60, 300] },
    { param: 'no2', unit: 'ppb', range: [20, 120] },
    { param: 'so2', unit: 'ppb', range: [5, 80] },
    { param: 'co', unit: 'ppm', range: [0.5, 5] },
    { param: 'o3', unit: 'ppb', range: [20, 100] }
  ];

  const aqiReadings = [];
  const now = new Date();

  // Create readings for last 7 days
  for (let day = 6; day >= 0; day--) {
    const readingDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day, 12, 0, 0);

    for (const city of cities) {
      for (const param of parameters) {
        const [min, max] = param.range;
        const value = min + Math.random() * (max - min);

        aqiReadings.push({
          stationName: `${city.name} Central`,
          city: city.name,
          country: 'IN',
          latitude: city.lat + (Math.random() * 0.1 - 0.05),
          longitude: city.lon + (Math.random() * 0.1 - 0.05),
          parameter: param.param,
          value,
          unit: param.unit,
          source: 'openaq',
          recordedAt: readingDate
        });
      }
    }
  }

  // Insert in batches to avoid overwhelming the database
  const batchSize = 50;
  for (let i = 0; i < aqiReadings.length; i += batchSize) {
    const batch = aqiReadings.slice(i, i + batchSize);
    await prisma.airQualityReading.createMany({
      data: batch,
      skipDuplicates: true
    });
  }

  console.log(`[seed-data] Created ${aqiReadings.length} air quality readings`);

  // Create a few sample reports to show in the UI
  console.log('[seed-data] Creating sample reports...');

  // Note: Actual PDF reports would be generated via the report generation feature
  // These are just placeholder records for the UI
  const sampleReports = [
    {
      type: 'EMISSIONS_MONTHLY',
      format: 'PDF',
      title: 'Monthly Emissions Report - October 2024',
      periodStart: new Date('2024-10-01'),
      periodEnd: new Date('2024-10-31'),
      storageKey: 'reports/sample1.pdf',
      sizeBytes: 1024 * 250, // 250KB
      pageCount: 12,
      generatedById: inspectorUser.id,
      industryId: createdIndustries[0].id
    },
    {
      type: 'COMPLIANCE_QUARTERLY',
      format: 'PDF',
      title: 'Quarterly Compliance Report - Q3 2024',
      periodStart: new Date('2024-07-01'),
      periodEnd: new Date('2024-09-30'),
      storageKey: 'reports/sample2.pdf',
      sizeBytes: 1024 * 180, // 180KB
      pageCount: 8,
      generatedById: inspectorUser.id
    }
  ];

  for (const reportData of sampleReports) {
    await prisma.report.create({
      data: reportData
    });
  }

  console.log('[seed-data] Created sample report records');

  console.log('[seed-data] ✅ Sample data population completed successfully!');
  console.log('[seed-data] Summary:');
  console.log(`  - ${createdIndustries.length} industries created`);
  console.log(`  - ${emissionLogCount} emission logs created (12 months each)`);
  console.log(`  - ${violationLogs.length} compliance notices created`);
  console.log(`  - ${aqiReadings.length} air quality readings created`);
  console.log(`  - 2 demo users created (inspector & industry)`);
  console.log('');
  console.log('[seed-data] Login credentials:');
  console.log('  Admin:     admin@climacore.local / admincool123');
  console.log('  Inspector: inspector@climacore.local / Inspector123');
  console.log('  Industry:  industry@climacore.local / Industry123');
  console.log('');
  console.log('[seed-data] Next steps:');
  console.log('  1. Start backend: cd backend && npm run dev');
  console.log('  2. Start frontend: npm run dev');
  console.log('  3. Login and test PDF generation');
}

main()
  .catch((err) => {
    console.error('[seed-data] ❌ Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());