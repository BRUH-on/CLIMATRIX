/**
 * Notice service — handles compliance notice generation and PDF rendering.
 * Notices are issued when emission logs breach thresholds and require
 * role-specific PDF documents for regulatory compliance.
 */
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { NoticeStatus, NoticeSeverity, type Notice } from '@prisma/client';
import { prisma } from '../prisma/client';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/ApiError';
import { renderNoticePdf, type NoticePdfData } from './pdf/noticePdf';

export const NOTICES_DIR = path.resolve(process.cwd(), 'files', 'notices');
fs.mkdirSync(NOTICES_DIR, { recursive: true });

interface IssueNoticeInput {
  emissionLogId: string;
  issuedById?: string | null;
  summary?: string;
  legalReference?: string;
  dueDays?: number;
}

/**
 * Issue a compliance notice for an emission log that breached thresholds.
 * Generates the PDF immediately and stores it alongside the DB record.
 */
export async function issueNotice(input: IssueNoticeInput): Promise<Notice> {
  const log = await prisma.emissionLog.findUnique({
    where: { id: input.emissionLogId },
    include: {
      industry: true,
      thresholds: true,
    },
  });

  if (!log) throw ApiError.notFound('Emission log not found');
  if (!log.industry) throw ApiError.badRequest('Emission log has no associated industry');
  if (log.overallStatus === 'COMPLIANT') {
    throw ApiError.badRequest('Cannot issue notice for compliant emission log');
  }

  // Check if a notice already exists for this log
  const existing = await prisma.notice.findFirst({
    where: { emissionLogId: input.emissionLogId },
  });
  if (existing) {
    throw ApiError.conflict('A notice already exists for this emission log');
  }

  const severity: NoticeSeverity =
    log.overallStatus === 'VIOLATION' ? 'CRITICAL' : 'WARNING';

  const noticeNumber = generateNoticeNumber();
  const issuedAt = new Date();
  const dueBy = input.dueDays
    ? new Date(Date.now() + input.dueDays * 24 * 60 * 60 * 1000)
    : null;

  // Determine breaches
  const breaches = [];
  const thresholds = log.thresholds;

  if (thresholds) {
    const co2 = Number(log.co2Kg);
    const nox = Number(log.noxKg);
    const sox = Number(log.soxKg);

    if (log.co2Status !== 'COMPLIANT') {
      breaches.push({
        pollutant: 'CO2' as const,
        unit: 'kg' as const,
        measured: co2,
        warningLimit: thresholds.co2Warning ? Number(thresholds.co2Warning) : null,
        violationLimit: thresholds.co2Violation ? Number(thresholds.co2Violation) : null,
        status: log.co2Status as 'WARNING' | 'VIOLATION',
      });
    }

    if (log.noxStatus !== 'COMPLIANT') {
      breaches.push({
        pollutant: 'NOX' as const,
        unit: 'kg' as const,
        measured: nox,
        warningLimit: thresholds.noxWarning ? Number(thresholds.noxWarning) : null,
        violationLimit: thresholds.noxViolation ? Number(thresholds.noxViolation) : null,
        status: log.noxStatus as 'WARNING' | 'VIOLATION',
      });
    }

    if (log.soxStatus !== 'COMPLIANT') {
      breaches.push({
        pollutant: 'SOX' as const,
        unit: 'kg' as const,
        measured: sox,
        warningLimit: thresholds.soxWarning ? Number(thresholds.soxWarning) : null,
        violationLimit: thresholds.soxViolation ? Number(thresholds.soxViolation) : null,
        status: log.soxStatus as 'WARNING' | 'VIOLATION',
      });
    }
  }

  const defaultSummary = `This notice is issued regarding emission measurements recorded on ${log.recordedAt.toISOString().slice(0, 10)} that exceeded regulatory limits.`;

  const pdfData: NoticePdfData = {
    noticeNumber,
    industryId: log.industryId,
    emissionLogId: log.id,
    severity,
    issuedAt,
    dueBy,
    periodStart: log.recordedAt,
    periodEnd: log.recordedAt,
    industry: {
      name: log.industry.name,
      registrationNo: log.industry.registrationNo,
      sector: log.industry.sector,
      addressLine1: log.industry.addressLine1,
      addressLine2: log.industry.addressLine2,
      city: log.industry.city,
      state: log.industry.state,
      postalCode: log.industry.postalCode,
      contactEmail: log.industry.contactEmail,
    },
    breaches,
    summary: input.summary || defaultSummary,
    legalReference: input.legalReference || null,
    issuedByName: input.issuedById ? await getUserName(input.issuedById) : null,
  };

  const filename = `${noticeNumber}.pdf`;
  const filepath = path.join(NOTICES_DIR, filename);
  const storageKey = `notices/${filename}`;

  await renderNoticePdf(pdfData, filepath);

  const stats = fs.statSync(filepath);

  const notice = await prisma.notice.create({
    data: {
      noticeNumber,
      emissionLogId: input.emissionLogId,
      industryId: log.industryId,
      severity,
      status: 'ISSUED',
      issuedAt,
      issuedById: input.issuedById || null,
      dueBy,
      summary: pdfData.summary,
      legalReference: input.legalReference || null,
      storageKey,
      sizeBytes: stats.size,
    },
  });

  logger.info(
    { noticeId: notice.id, noticeNumber, severity, industryId: log.industryId },
    'Compliance notice issued',
  );

  return notice;
}

/**
 * Acknowledge a notice (industry user marks it as received/acknowledged).
 */
export async function acknowledgeNotice(
  noticeId: string,
  userId: string,
): Promise<Notice> {
  const notice = await prisma.notice.findUnique({
    where: { id: noticeId },
  });

  if (!notice) throw ApiError.notFound('Notice not found');
  if (notice.status !== 'ISSUED') {
    throw ApiError.badRequest('Notice cannot be acknowledged in current status');
  }

  const updated = await prisma.notice.update({
    where: { id: noticeId },
    data: {
      status: 'ACKNOWLEDGED',
      acknowledgedAt: new Date(),
      acknowledgedById: userId,
    },
  });

  logger.info({ noticeId, userId }, 'Notice acknowledged');
  return updated;
}

/**
 * List notices with filtering by industry and status.
 */
export async function listNotices(filters: {
  industryId?: string;
  status?: NoticeStatus;
  limit?: number;
}) {
  const where: any = {};
  if (filters.industryId) where.industryId = filters.industryId;
  if (filters.status) where.status = filters.status;

  return prisma.notice.findMany({
    where,
    orderBy: { issuedAt: 'desc' },
    take: filters.limit || 100,
    include: {
      industry: { select: { name: true, sector: true } },
      issuedBy: { select: { fullName: true } },
      acknowledgedBy: { select: { fullName: true } },
    },
  });
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function generateNoticeNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = randomUUID().slice(0, 8).toUpperCase();
  return `CC-${year}${month}-${random}`;
}

async function getUserName(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fullName: true },
  });
  return user?.fullName || null;
}
