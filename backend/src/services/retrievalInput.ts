import { z } from 'zod';
import { ApiError } from '../utils/ApiError';
import type { RetrievalRequest } from './retrievalService';

const retrievalToolNames = new Set(['emissions', 'compliance', 'threshold', 'anomalies']);

export const retrievalRequestSchema = z
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
    if (
      'startDate' in request &&
      request.startDate &&
      request.endDate &&
      request.startDate > request.endDate
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['startDate'],
        message: 'startDate must be on or before endDate',
      });
    }
    if (request.tool === 'threshold' && request.periodStart > request.periodEnd) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['periodStart'],
        message: 'periodStart must be on or before periodEnd',
      });
    }
  });

export function parseRetrievalRequest(input: unknown): RetrievalRequest {
  return retrievalRequestSchema.parse(input) as RetrievalRequest;
}

export function parseRetrievalToolArguments(
  toolName: string,
  argumentsValue: unknown,
): RetrievalRequest {
  if (!retrievalToolNames.has(toolName)) {
    throw new ApiError(502, 'The LLM selected an unsupported retrieval tool.', 'LLM_TOOL_NOT_ALLOWED');
  }
  if (!isRecord(argumentsValue) || 'tool' in argumentsValue) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        path: [],
        message: 'Tool arguments must be an object without a tool field',
      },
    ]);
  }

  return parseRetrievalRequest({ ...argumentsValue, tool: toolName });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}