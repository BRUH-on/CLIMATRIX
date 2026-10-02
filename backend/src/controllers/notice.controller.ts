import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { NoticeSeverity, NoticeStatus } from '@prisma/client';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { prisma } from '../prisma/client';
import {
  issueNotice,
  acknowledgeNotice,
  listNotices,
  NOTICES_DIR
} from '../services/noticeService';

const issueSchema = z.object({
  emissionLogId: z.string().min(1),
  summary: z.string().optional(),
  legalReference: z.string().optional(),
  dueDays: z.number().int().positive().max(365).optional(),
});

const listSchema = z.object({
  status: z.nativeEnum(NoticeStatus).optional(),
  industryId: z.string().optional(),
  limit: z.number().int().positive().max(100).default(50),
});

/** POST /api/v1/notices/issue — issue a compliance notice for an emission breach */
export const issue = asyncHandler(async (req, res) => {
  const input = issueSchema.parse(req.body);

  // Only ADMIN and INSPECTOR roles can issue notices
  if (req.user?.role === 'INDUSTRY') {
    throw ApiError.forbidden('Industry users cannot issue compliance notices');
  }

  const notice = await issueNotice({
    ...input,
    issuedById: req.user?.id,
  });

  res.status(201).json(toPublic(notice));
});

/** GET /api/v1/notices — list notices (filtered by role) */
export const list = asyncHandler(async (req, res) => {
  const query = listSchema.parse(req.query);

  // INDUSTRY users can only see their own notices
  let industryId = query.industryId;
  if (req.user?.role === 'INDUSTRY') {
    industryId = req.user.industryId ?? undefined;
  }

  const notices = await listNotices({
    status: query.status,
    industryId,
    limit: query.limit,
  });

  res.json({
    count: notices.length,
    notices: notices.map((n) => ({
      ...toPublic(n),
      industryName: n.industry?.name ?? null,
      issuedByName: n.issuedBy?.fullName ?? null,
      acknowledgedByName: n.acknowledgedBy?.fullName ?? null,
    })),
  });
});

/** GET /api/v1/notices/:id — get single notice details */
export const get = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };

  const notice = await prisma.notice.findUnique({
    where: { id },
    include: {
      industry: { select: { name: true, sector: true } },
      emissionLog: {
        select: {
          recordedAt: true,
          co2Kg: true,
          noxKg: true,
          soxKg: true,
          overallStatus: true
        }
      },
      issuedBy: { select: { fullName: true } },
      acknowledgedBy: { select: { fullName: true } },
    },
  });

  if (!notice) throw ApiError.notFound('Notice not found');

  // INDUSTRY users can only access their own notices
  if (
    req.user?.role === 'INDUSTRY' &&
    notice.industryId !== req.user.industryId
  ) {
    throw ApiError.forbidden('Cannot access notices from other industries');
  }

  res.json({
    ...toPublic(notice),
    industryName: notice.industry?.name ?? null,
    emissionLog: notice.emissionLog,
    issuedByName: notice.issuedBy?.fullName ?? null,
    acknowledgedByName: notice.acknowledgedBy?.fullName ?? null,
  });
});

/** GET /api/v1/notices/:id/download — download the notice PDF */
export const download = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };

  const notice = await prisma.notice.findUnique({ where: { id } });
  if (!notice) throw ApiError.notFound('Notice not found');

  // INDUSTRY users can only download their own notices
  if (
    req.user?.role === 'INDUSTRY' &&
    notice.industryId !== req.user.industryId
  ) {
    throw ApiError.forbidden('Cannot access notices from other industries');
  }

  const filepath = path.join(NOTICES_DIR, path.basename(notice.storageKey));
  if (!fs.existsSync(filepath)) {
    throw ApiError.notFound('Notice PDF file is missing');
  }

  const safeName = `Notice_${notice.noticeNumber}.pdf`.replace(/[^\w\-. ]+/g, '_');

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Length', String(notice.sizeBytes));
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);

  const stream = fs.createReadStream(filepath);
  stream.on('error', () => {
    if (!res.headersSent) {
      res.status(500).json({
        error: { code: 'STREAM_ERROR', message: 'Failed to stream notice PDF' },
      });
    } else {
      res.end();
    }
  });
  stream.pipe(res);
});

/** POST /api/v1/notices/:id/acknowledge — acknowledge a notice (industry only) */
export const acknowledge = asyncHandler(async (req, res) => {
  const { id } = req.params as { id: string };

  // Only INDUSTRY users can acknowledge notices
  if (req.user?.role !== 'INDUSTRY') {
    throw ApiError.forbidden('Only industry users can acknowledge notices');
  }

  const notice = await acknowledgeNotice(id, req.user.id);
  res.json(toPublic(notice));
});

/** GET /api/v1/notices/pending — get notices awaiting acknowledgment (industry) or pending action (inspector) */
export const pending = asyncHandler(async (req, res) => {
  let where: any = {};

  if (req.user?.role === 'INDUSTRY') {
    // Industry: notices issued to them that need acknowledgment
    where = {
      industryId: req.user.industryId,
      status: 'ISSUED',
    };
  } else if (req.user?.role === 'INSPECTOR') {
    // Inspector: notices that need follow-up or are overdue
    where = {
      OR: [
        { status: 'ISSUED', dueBy: { lt: new Date() } }, // Overdue
        { status: 'ACKNOWLEDGED' }, // Need follow-up
      ],
    };
  } else {
    // Admin: all pending notices
    where = {
      status: { in: ['ISSUED', 'ACKNOWLEDGED'] },
    };
  }

  const notices = await prisma.notice.findMany({
    where,
    include: {
      industry: { select: { name: true, sector: true } },
      issuedBy: { select: { fullName: true } },
    },
    orderBy: { issuedAt: 'desc' },
    take: 50,
  });

  res.json({
    count: notices.length,
    notices: notices.map((n) => ({
      ...toPublic(n),
      industryName: n.industry?.name ?? null,
      issuedByName: n.issuedBy?.fullName ?? null,
      isOverdue: n.dueBy && n.dueBy < new Date(),
    })),
  });
});

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function toPublic(n: {
  id: string;
  noticeNumber: string;
  severity: NoticeSeverity;
  status: NoticeStatus;
  summary: string;
  legalReference: string | null;
  issuedAt: Date | null;
  dueBy: Date | null;
  acknowledgedAt: Date | null;
  industryId: string;
  emissionLogId: string;
  storageKey: string;
  sizeBytes: number;
  createdAt: Date;
}) {
  return {
    id: n.id,
    noticeNumber: n.noticeNumber,
    severity: n.severity,
    status: n.status,
    summary: n.summary,
    legalReference: n.legalReference,
    issuedAt: n.issuedAt,
    dueBy: n.dueBy,
    acknowledgedAt: n.acknowledgedAt,
    industryId: n.industryId,
    emissionLogId: n.emissionLogId,
    sizeBytes: n.sizeBytes,
    createdAt: n.createdAt,
    downloadUrl: `/api/v1/notices/${n.id}/download`,
  };
}