import type { RequestHandler } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { asyncHandler } from '../utils/asyncHandler';
import { ApiError } from '../utils/ApiError';
import { answerWithRetrievalTools } from '../services/llm/assistantService';
import { CompatibleChatProvider } from '../services/llm/compatibleChatProvider';
import type { LlmProvider } from '../services/llm/llmTypes';

const questionSchema = z.object({
  question: z.string().trim().min(1).max(2000),
}).strict();

export function createAssistantController(
  providerResolver: () => LlmProvider | null = configuredProvider,
): RequestHandler {
  return asyncHandler(async (req, res) => {
    const { question } = questionSchema.parse(req.body);
    const provider = providerResolver();
    if (!provider) {
      throw new ApiError(
        503,
        'LLM provider is not configured. Set LLM_API_URL and LLM_MODEL on the backend.',
        'LLM_NOT_CONFIGURED',
      );
    }

    const answer = await answerWithRetrievalTools(req.user!, question, provider);
    res.json(answer);
  });
}

export const assistant = createAssistantController();

function configuredProvider(): LlmProvider | null {
  if (!env.LLM_API_URL || !env.LLM_MODEL) return null;
  return new CompatibleChatProvider({
    apiUrl: env.LLM_API_URL,
    model: env.LLM_MODEL,
    apiKey: env.LLM_API_KEY,
  });
}