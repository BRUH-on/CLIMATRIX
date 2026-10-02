import type { AuthedUser } from '../../middleware/requireAuth';
import { ApiError } from '../../utils/ApiError';
import { retrieveForUser, type RetrievalResult } from '../retrievalService';
import { parseRetrievalToolArguments } from '../retrievalInput';
import { RETRIEVAL_TOOL_DEFINITIONS } from './retrievalToolDefinitions';
import type { LlmMessage, LlmProvider, LlmToolCall } from './llmTypes';

export const UNSUPPORTED_QUESTION_ANSWER =
  'That question is outside the currently supported retrieval capabilities. I can retrieve emissions, compliance assessments, applicable thresholds, and anomaly results for an authorized industry.';

const SYSTEM_INSTRUCTIONS = `You are ClimaCore's retrieval assistant. Use only the supplied retrieval tools to answer questions about application data. Select one tool for a supported question. Do not invent or calculate database values, thresholds, compliance results, or anomalies. After receiving a tool result, explain only facts in that result and preserve its status. If no tool can answer the question, do not call a tool. Never request SQL, write actions, credentials, or data outside the user's authorized scope.`;

export interface AssistantAnswer {
  status: RetrievalResult['status'] | 'UNSUPPORTED';
  tool: string | null;
  result: RetrievalResult | null;
  answer: string;
}

export async function answerWithRetrievalTools(
  user: AuthedUser,
  question: string,
  provider: LlmProvider,
): Promise<AssistantAnswer> {
  const messages: LlmMessage[] = [
    { role: 'system', content: SYSTEM_INSTRUCTIONS },
    { role: 'user', content: question },
  ];
  const selection = await provider.complete(messages, RETRIEVAL_TOOL_DEFINITIONS);
  const toolCalls = selection.toolCalls ?? [];

  if (toolCalls.length === 0) {
    return {
      status: 'UNSUPPORTED',
      tool: null,
      result: null,
      answer: UNSUPPORTED_QUESTION_ANSWER,
    };
  }
  if (toolCalls.length !== 1) {
    throw new ApiError(502, 'Only one retrieval tool call is allowed per request.', 'LLM_TOOL_PROTOCOL_ERROR');
  }

  const toolCall = toolCalls[0]!;
  const retrievalRequest = parseRetrievalToolArguments(
    toolCall.name,
    toolCall.arguments,
  );
  const result = await retrieveForUser(user, retrievalRequest);

  const explanationMessages: LlmMessage[] = [
    ...messages,
    assistantToolCallMessage(toolCall),
    {
      role: 'tool',
      toolCallId: toolCall.id,
      content: JSON.stringify(result),
    },
  ];
  const explanation = await provider.complete(explanationMessages, []);
  if (explanation.toolCalls?.length) {
    throw new ApiError(502, 'The LLM provider attempted an additional tool call.', 'LLM_TOOL_PROTOCOL_ERROR');
  }

  const answer = explanation.text?.trim() ||
    'The retrieval completed. See the structured result for verified details.';
  return {
    status: result.status,
    tool: retrievalRequest.tool,
    result,
    answer,
  };
}

function assistantToolCallMessage(call: LlmToolCall): LlmMessage {
  return {
    role: 'assistant',
    content: null,
    toolCalls: [call],
  };
}