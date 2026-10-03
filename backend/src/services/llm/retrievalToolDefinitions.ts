import type { LlmToolDefinition } from './llmTypes';

const industryId = { type: 'string', minLength: 1 };
const pollutant = { type: 'string', enum: ['CO2', 'NOX', 'SOX', 'PM25'] };
const dateTime = { type: 'string', format: 'date-time' };
const limit = { type: 'integer', minimum: 1, maximum: 500 };

export const RETRIEVAL_TOOL_DEFINITIONS: readonly LlmToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'emissions',
      description: 'Retrieve recent emission records for one authorized industry.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          industryId,
          pollutant,
          startDate: dateTime,
          endDate: dateTime,
          limit,
        },
        required: ['industryId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'compliance',
      description: 'Retrieve stored-threshold compliance assessments for an industry.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          industryId,
          pollutant,
          status: { type: 'string', enum: ['COMPLIANT', 'WARNING', 'VIOLATION'] },
          startDate: dateTime,
          endDate: dateTime,
          limit,
        },
        required: ['industryId', 'pollutant'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'threshold',
      description: 'Retrieve the active stored threshold covering a reporting period.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          industryId,
          pollutant,
          periodStart: dateTime,
          periodEnd: dateTime,
        },
        required: ['industryId', 'pollutant', 'periodStart', 'periodEnd'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'anomalies',
      description: 'Retrieve deterministic anomaly results for an industry.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: { industryId, limit },
        required: ['industryId'],
      },
    },
  },
];

export const APPROVED_RETRIEVAL_TOOL_NAMES = new Set(
  RETRIEVAL_TOOL_DEFINITIONS.map((tool) => tool.function.name),
);