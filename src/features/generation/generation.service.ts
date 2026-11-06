import { z } from "zod";

import type { GenerationConfig } from "@/features/generation/generation.config";
import {
  topicSchema,
  type GenerateQuizInput,
} from "@/features/generation/generation.model";
import { buildGroundedPrompt } from "@/features/generation/generation.prompt";
import type { GenerationServiceInterface } from "@/features/generation/generation.service.interface";
import type { LlmClientInterface } from "@/features/generation/llm-client.interface";
import {
  quizDraftSchema,
  type Quiz,
  type QuizDraft,
} from "@/features/quiz/quiz.model";
import type { QuizServiceInterface } from "@/features/quiz/quiz.service.interface";
import type { RetrievalServiceInterface } from "@/features/retrieval/retrieval.service.interface";
import {
  NoRelevantSourcesError,
  QuizGenerationError,
  ValidationError,
} from "@/shared/errors";

/** The quiz draft's shape as JSON Schema, which Ollama uses to constrain the model's reply. */
const QUIZ_DRAFT_JSON_SCHEMA = z.toJSONSchema(quizDraftSchema);

export class GenerationService implements GenerationServiceInterface {
  constructor(
    private readonly retrievalService: RetrievalServiceInterface,
    private readonly llmClient: LlmClientInterface,
    private readonly quizService: QuizServiceInterface,
    private readonly config: GenerationConfig,
  ) {}

  async generateQuiz(input: GenerateQuizInput): Promise<Quiz> {
    const topicCheck = topicSchema.safeParse(input.topic);
    if (!topicCheck.success) {
      throw new ValidationError(topicCheck.error.issues[0].message);
    }
    const topic = topicCheck.data;

    const chunks = await this.retrievalService.retrieve(
      topic,
      this.config.chunksPerRetrieval,
    );
    if (chunks.length === 0) {
      throw new NoRelevantSourcesError();
    }

    const reply = await this.llmClient.chat({
      messages: buildGroundedPrompt({
        topic,
        chunks,
        questionCount: this.config.questionsPerQuiz,
      }),
      jsonSchema: QUIZ_DRAFT_JSON_SCHEMA,
      sampling: this.config.sampling,
    });

    return this.quizService.createQuiz({
      topic,
      draft: parseQuizDraft(reply),
      excerpts: chunks.map((chunk) => ({
        chunkId: chunk.id,
        sourceTitle: chunk.sourceTitle,
        text: chunk.text,
        similarity: chunk.similarity,
      })),
      ungrounded: false,
    });
  }
}

/**
 * Returns the reply as a quiz draft, or throws `QuizGenerationError` when it
 * isn't JSON, doesn't match the draft schema or breaks one of its extra rules.
 */
function parseQuizDraft(reply: string): QuizDraft {
  let json: unknown;
  try {
    json = JSON.parse(reply);
  } catch {
    throw new QuizGenerationError();
  }

  const draftCheck = quizDraftSchema.safeParse(json);
  if (!draftCheck.success) {
    throw new QuizGenerationError();
  }
  return draftCheck.data;
}
