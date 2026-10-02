import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/requireAuth';
import {
  issue,
  list,
  get,
  download,
  acknowledge,
  pending,
} from '../controllers/notice.controller';

export const noticeRouter = Router();

// All notice endpoints require authentication
noticeRouter.use(requireAuth);

// Issue notice (ADMIN/INSPECTOR only)
noticeRouter.post('/issue', requireRole('ADMIN', 'INSPECTOR'), issue);

// List notices (filtered by role)
noticeRouter.get('/', list);

// Get pending notices (role-specific)
noticeRouter.get('/pending', pending);

// Get single notice
noticeRouter.get('/:id', get);

// Download notice PDF
noticeRouter.get('/:id/download', download);

// Acknowledge notice (INDUSTRY only)
noticeRouter.post('/:id/acknowledge', requireRole('INDUSTRY'), acknowledge);