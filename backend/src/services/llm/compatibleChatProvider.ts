import { ApiError } from '../../utils/ApiError';
import type {
  LlmMessage,
  LlmProvider,
  LlmToolCall,
  LlmToolDefinition,
  LlmTurn,
} from './llmTypes';

export interface CompatibleChatConfig {
  apiUrl: string;
  model: string;
  apiKey?: string;
}

interface CompatibleChatResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
      tool_calls?: Array<{
        id?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
  }>;
}

export class CompatibleChatProvider implements LlmProvider {
  constructor(
    private readonly config: CompatibleChatConfig,
    private readonly fetchImplementation: typeof fetch = fetch,
  ) {}

  async complete(
    messages: LlmMessage[],
    tools: readonly LlmToolDefinition[],
  ): Promise<LlmTurn> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (this.config.apiKey) {
      headers.Authorization = `Bearer ${this.config.apiKey}`;
    }

    let response: Response;
    try {
      response = await this.fetchImplementation(this.config.apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.config.model,
          messages: messages.map(serializeMessage),
          tools: tools.map((tool) => ({
            type: tool.type,
            function: tool.function,
          })),
          tool_choice: tools.length ? 'auto' : 'none',
        }),
        signal: AbortSignal.timeout(20_000),
      });
    } catch {
      throw providerError('The LLM provider could not be reached.');
    }

    if (!response.ok) {
      throw providerError(`The LLM provider returned HTTP ${response.status}.`);
    }

    let payload: CompatibleChatResponse;
    try {
      payload = (await response.json()) as CompatibleChatResponse;
    } catch {
      throw providerError('The LLM provider returned an invalid response.');
    }

    const message = payload.choices?.[0]?.message;
    if (!message) throw providerError('The LLM provider returned no message.');

    return {
      text: message.content,
      toolCalls: (message.tool_calls ?? []).map(parseToolCall),
    };
  }
}

function serializeMessage(message: LlmMessage): Record<string, unknown> {
  if (message.role === 'tool') {
    return {
      role: 'tool',
      tool_call_id: message.toolCallId,
      content: message.content,
    };
  }
  if (message.role === 'assistant' && message.toolCalls) {
    return {
      role: 'assistant',
      content: message.content,
      tool_calls: message.toolCalls.map((call) => ({
        id: call.id,
        type: 'function',
        function: {
          name: call.name,
          arguments: JSON.stringify(call.arguments),
        },
      })),
    };
  }
  return { role: message.role, content: message.content };
}

function parseToolCall(input: {
  id?: string;
  function?: { name?: string; arguments?: string };
}): LlmToolCall {
  const id = input.id;
  const name = input.function?.name;
  const rawArguments = input.function?.arguments;
  if (!id || !name || typeof rawArguments !== 'string') {
    throw providerError('The LLM provider returned a malformed tool call.');
  }

  let argumentsValue: unknown;
  try {
    argumentsValue = JSON.parse(rawArguments) as unknown;
  } catch {
    throw providerError('The LLM provider returned malformed tool arguments.');
  }

  return { id, name, arguments: argumentsValue };
}

function providerError(message: string): ApiError {
  return new ApiError(502, message, 'LLM_PROVIDER_ERROR');
}