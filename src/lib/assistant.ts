import { api, ApiError } from './api';

export type AssistantStatus =
  | 'SUCCESS'
  | 'NO_DATA'
  | 'NO_APPLICABLE_THRESHOLD'
  | 'INVALID_THRESHOLD'
  | 'UNIT_MISMATCH'
  | 'UNSUPPORTED';

export interface AssistantRetrievalResult {
  tool: 'emissions' | 'compliance' | 'threshold' | 'anomalies';
  status: string;
  data: unknown;
}

export interface AssistantResponse {
  status: AssistantStatus;
  tool: AssistantRetrievalResult['tool'] | null;
  result: AssistantRetrievalResult | null;
  answer: string;
}

const STATUS_VALUES: AssistantStatus[] = [
  'SUCCESS',
  'NO_DATA',
  'NO_APPLICABLE_THRESHOLD',
  'INVALID_THRESHOLD',
  'UNIT_MISMATCH',
  'UNSUPPORTED',
];
const TOOL_VALUES: AssistantRetrievalResult['tool'][] = [
  'emissions',
  'compliance',
  'threshold',
  'anomalies',
];

export async function askAssistant(question: string): Promise<AssistantResponse> {
  const response = await api<unknown>('/insights/assistant', {
    method: 'POST',
    body: { question },
    auth: true,
  });

  if (!isAssistantResponse(response)) {
    throw new ApiError(
      502,
      'The assistant returned an unexpected response.',
      'INVALID_ASSISTANT_RESPONSE',
    );
  }

  return response;
}

export function assistantErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'The assistant is temporarily unavailable. Please try again.';
  }

  if (error.code === 'NETWORK_ERROR') {
    return 'Cannot reach ClimaCore. Check that the backend is running and try again.';
  }
  if (error.status === 401) {
    return 'Your session has expired. Sign in again to use the assistant.';
  }
  if (error.status === 403) {
    return 'You do not have access to the requested industry data.';
  }
  if (error.status === 400) {
    return 'The question could not be processed. Please rephrase it and try again.';
  }
  if (error.status === 503 || error.code === 'LLM_NOT_CONFIGURED') {
    return 'The AI Assistant is not configured yet. Please contact your administrator.';
  }
  return 'The assistant is temporarily unavailable. Please try again.';
}

function isAssistantResponse(value: unknown): value is AssistantResponse {
  if (!isRecord(value)) return false;
  if (!STATUS_VALUES.includes(value.status as AssistantStatus)) return false;
  if (typeof value.answer !== 'string') return false;
  if (value.tool !== null && !TOOL_VALUES.includes(value.tool as AssistantRetrievalResult['tool'])) {
    return false;
  }
  if (value.result === null) {
    return value.status === 'UNSUPPORTED' && value.tool === null;
  }
  if (!isRecord(value.result)) return false;
  if (value.status === 'UNSUPPORTED' || value.tool === null) return false;
  return (
    TOOL_VALUES.includes(value.result.tool as AssistantRetrievalResult['tool']) &&
    value.result.tool === value.tool &&
    value.result.status === value.status &&
    'data' in value.result
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}