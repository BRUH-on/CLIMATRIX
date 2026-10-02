export interface LlmToolCall {
  id: string;
  name: string;
  arguments: unknown;
}

export type LlmMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; toolCalls?: LlmToolCall[] }
  | { role: 'tool'; content: string; toolCallId: string };

export interface LlmTurn {
  text?: string | null;
  toolCalls?: LlmToolCall[];
}

export interface LlmToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      additionalProperties: false;
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}

export interface LlmProvider {
  complete(
    messages: LlmMessage[],
    tools: readonly LlmToolDefinition[],
  ): Promise<LlmTurn>;
}