-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'INSPECTOR', 'INDUSTRY');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('COMPLIANT', 'WARNING', 'VIOLATION');

-- CreateEnum
CREATE TYPE "NoticeStatus" AS ENUM ('DRAFT', 'ISSUED', 'ACKNOWLEDGED', 'RESOLVED', 'ESCALATED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NoticeSeverity" AS ENUM ('WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "Pollutant" AS ENUM ('CO2', 'NOX', 'SOX', 'PM25', 'PM10', 'CO');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('COAL', 'DIESEL', 'PETROL', 'NATURAL_GAS', 'LPG', 'FURNACE_OIL', 'BIOMASS', 'ELECTRICITY_GRID', 'OTHER');

-- CreateEnum
CREATE TYPE "IndustrySector" AS ENUM ('POWER', 'STEEL', 'CEMENT', 'CHEMICAL', 'REFINING', 'TEXTILE', 'PAPER', 'MANUFACTURING', 'MINING', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('EMISSIONS_MONTHLY', 'EMISSIONS_QUARTERLY', 'COMPLIANCE_QUARTERLY', 'ANNUAL_REPORT', 'FACILITY_AUDIT', 'AI_INSIGHTS', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ReportFormat" AS ENUM ('PDF', 'CSV');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "role" "Role" NOT NULL,
    "industryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "industries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "registrationNo" TEXT NOT NULL,
    "sector" "IndustrySector" NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'IN',
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "industries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspector_assignments" (
    "id" TEXT NOT NULL,
    "inspectorId" TEXT NOT NULL,
    "industryId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),

    CONSTRAINT "inspector_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_thresholds" (
    "id" TEXT NOT NULL,
    "sector" "IndustrySector" NOT NULL,
    "pollutant" "Pollutant" NOT NULL,
    "unit" TEXT NOT NULL,
    "warningLimit" DECIMAL(14,4) NOT NULL,
    "violationLimit" DECIMAL(14,4) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_thresholds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emission_logs" (
    "id" TEXT NOT NULL,
    "industryId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "periodStart" DATE NOT NULL,
    "periodEnd" DATE NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "electricityKwh" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "productionVolume" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "productionUnit" TEXT NOT NULL DEFAULT 'UNITS',
    "co2Kg" DECIMAL(14,4),
    "noxKg" DECIMAL(14,4),
    "soxKg" DECIMAL(14,4),
    "pm25Ugm3" DECIMAL(10,4),
    "co2Status" "ComplianceStatus",
    "noxStatus" "ComplianceStatus",
    "soxStatus" "ComplianceStatus",
    "overallStatus" "ComplianceStatus" NOT NULL DEFAULT 'COMPLIANT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emission_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuel_consumptions" (
    "id" TEXT NOT NULL,
    "emissionLogId" TEXT NOT NULL,
    "fuelType" "FuelType" NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "unit" TEXT NOT NULL,

    CONSTRAINT "fuel_consumptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_notices" (
    "id" TEXT NOT NULL,
    "noticeNumber" TEXT NOT NULL,
    "industryId" TEXT NOT NULL,
    "emissionLogId" TEXT NOT NULL,
    "issuedById" TEXT,
    "status" "NoticeStatus" NOT NULL DEFAULT 'DRAFT',
    "severity" "NoticeSeverity" NOT NULL DEFAULT 'WARNING',
    "breachedPollutants" "Pollutant"[],
    "summary" TEXT NOT NULL,
    "legalReference" TEXT,
    "pdfStorageKey" TEXT,
    "pdfUrl" TEXT,
    "pdfGeneratedAt" TIMESTAMP(3),
    "emailedAt" TIMESTAMP(3),
    "emailRecipients" TEXT[],
    "issuedAt" TIMESTAMP(3),
    "dueBy" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "air_quality_readings" (
    "id" TEXT NOT NULL,
    "stationName" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'IN',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "parameter" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'openaq',
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "air_quality_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "format" "ReportFormat" NOT NULL DEFAULT 'PDF',
    "title" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "storageKey" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "pageCount" INTEGER,
    "generatedById" TEXT,
    "industryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_industryId_idx" ON "users"("industryId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_expiresAt_idx" ON "refresh_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "industries_registrationNo_key" ON "industries"("registrationNo");

-- CreateIndex
CREATE INDEX "industries_sector_idx" ON "industries"("sector");

-- CreateIndex
CREATE INDEX "industries_city_state_idx" ON "industries"("city", "state");

-- CreateIndex
CREATE INDEX "inspector_assignments_industryId_idx" ON "inspector_assignments"("industryId");

-- CreateIndex
CREATE UNIQUE INDEX "inspector_assignments_inspectorId_industryId_key" ON "inspector_assignments"("inspectorId", "industryId");

-- CreateIndex
CREATE INDEX "compliance_thresholds_sector_pollutant_isActive_idx" ON "compliance_thresholds"("sector", "pollutant", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_thresholds_sector_pollutant_effectiveFrom_key" ON "compliance_thresholds"("sector", "pollutant", "effectiveFrom");

-- CreateIndex
CREATE INDEX "emission_logs_recordedAt_idx" ON "emission_logs"("recordedAt");

-- CreateIndex
CREATE INDEX "emission_logs_industryId_recordedAt_idx" ON "emission_logs"("industryId", "recordedAt" DESC);

-- CreateIndex
CREATE INDEX "emission_logs_overallStatus_idx" ON "emission_logs"("overallStatus");

-- CreateIndex
CREATE UNIQUE INDEX "emission_logs_industryId_periodStart_periodEnd_key" ON "emission_logs"("industryId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "fuel_consumptions_emissionLogId_idx" ON "fuel_consumptions"("emissionLogId");

-- CreateIndex
CREATE INDEX "fuel_consumptions_fuelType_idx" ON "fuel_consumptions"("fuelType");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_notices_noticeNumber_key" ON "compliance_notices"("noticeNumber");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_notices_emissionLogId_key" ON "compliance_notices"("emissionLogId");

-- CreateIndex
CREATE INDEX "compliance_notices_industryId_status_idx" ON "compliance_notices"("industryId", "status");

-- CreateIndex
CREATE INDEX "compliance_notices_status_idx" ON "compliance_notices"("status");

-- CreateIndex
CREATE INDEX "compliance_notices_issuedAt_idx" ON "compliance_notices"("issuedAt");

-- CreateIndex
CREATE INDEX "air_quality_readings_city_parameter_recordedAt_idx" ON "air_quality_readings"("city", "parameter", "recordedAt" DESC);

-- CreateIndex
CREATE INDEX "air_quality_readings_recordedAt_idx" ON "air_quality_readings"("recordedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "air_quality_readings_stationName_parameter_recordedAt_key" ON "air_quality_readings"("stationName", "parameter", "recordedAt");

-- CreateIndex
CREATE INDEX "reports_createdAt_idx" ON "reports"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "reports_generatedById_idx" ON "reports"("generatedById");

-- CreateIndex
CREATE INDEX "reports_industryId_createdAt_idx" ON "reports"("industryId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "industries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspector_assignments" ADD CONSTRAINT "inspector_assignments_inspectorId_fkey" FOREIGN KEY ("inspectorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspector_assignments" ADD CONSTRAINT "inspector_assignments_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "industries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emission_logs" ADD CONSTRAINT "emission_logs_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "industries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emission_logs" ADD CONSTRAINT "emission_logs_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_consumptions" ADD CONSTRAINT "fuel_consumptions_emissionLogId_fkey" FOREIGN KEY ("emissionLogId") REFERENCES "emission_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_notices" ADD CONSTRAINT "compliance_notices_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "industries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_notices" ADD CONSTRAINT "compliance_notices_emissionLogId_fkey" FOREIGN KEY ("emissionLogId") REFERENCES "emission_logs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_notices" ADD CONSTRAINT "compliance_notices_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "industries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
