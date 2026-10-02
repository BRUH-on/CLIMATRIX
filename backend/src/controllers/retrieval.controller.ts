import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { retrieveForUser, type RetrievalRequest } from '../services/retrievalService';

const retrievalRequestSchema = z
  .discriminatedUnion('tool', [
    z.object({
      tool: z.literal('emissions'),
      industryId: z.string().min(1),
      pollutant: z.enum(['CO2', 'NOX', 'SOX', 'PM25']).optional(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      limit: z.coerce.number().int().positive().max(500).default(50),
    }).strict(),
    z.object({
      tool: z.literal('compliance'),
      industryId: z.string().min(1),
      pollutant: z.enum(['CO2', 'NOX', 'SOX', 'PM25']),
      status: z.enum(['COMPLIANT', 'WARNING', 'VIOLATION']).optional(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      limit: z.coerce.number().int().positive().max(500).default(50),
    }).strict(),
    z.object({
      tool: z.literal('threshold'),
      industryId: z.string().min(1),
      pollutant: z.enum(['CO2', 'NOX', 'SOX', 'PM25']),
      periodStart: z.coerce.date(),
      periodEnd: z.coerce.date(),
    }).strict(),
    z.object({
      tool: z.literal('anomalies'),
      industryId: z.string().min(1),
      limit: z.coerce.number().int().positive().max(500).default(100),
    }).strict(),
  ])
  .superRefine((request, context) => {
    if ('startDate' in request && request.startDate && request.endDate && request.startDate > request.endDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['startDate'],
        message: 'startDate must be on or before endDate',
      });
    }
    if (
      request.tool === 'threshold' &&
      request.periodStart > request.periodEnd
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['periodStart'],
        message: 'periodStart must be on or before periodEnd',
      });
    }
  });

export const retrieve = asyncHandler(async (req, res) => {
  const request = retrievalRequestSchema.parse(req.body) as RetrievalRequest;
  const result = await retrieveForUser(req.user!, request);
  res.json(result);
});