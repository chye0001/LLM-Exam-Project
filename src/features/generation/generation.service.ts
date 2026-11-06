import { z } from "zod";

import type { GenerationConfig } from "@/features/generation/generation.config";
import {
  topicSchema,
  type ChatMessage,
  type GenerateQuizInput,
} from "@/features/generation/generation.model";
import {
  buildGroundedPrompt,
  buildUngroundedPrompt,
} from "@/features/generation/generation.prompt";
import type { GenerationServiceInterface } from "@/features/generation/generation.service.interface";
import type { LlmClientInterface } from "@/features/generation/generation.llm-client.interface";
import {
  quizDraftSchema,
  type Quiz,
  type QuizDraft,
} from "@/features/quiz/quiz.model";
import type { QuizServiceInterface } from "@/features/quiz/quiz.service.interface";
import type { RetrievalServiceInterface } from "@/features/retrieval/retrieval.service.interface";
import {
  ModelTimeoutError,
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

    if (input.skipRetrieval) {
      if (!this.config.demoMode) {
        throw new ValidationError("Skipping retrieval is only allowed in demo mode.");
      }
      return this.generateUngroundedQuiz(topic);
    }

    const chunks = await this.retrievalService.retrieve(
      topic,
      this.config.chunksPerRetrieval,
    );
    if (chunks.length === 0) {
      throw new NoRelevantSourcesError();
    }

    const draft = await this.writeDraft(
      buildGroundedPrompt({
        topic,
        chunks,
        questionCount: this.config.questionsPerQuiz,
      }),
    );

    return this.quizService.createQuiz({
      topic,
      draft,
      excerpts: chunks.map((chunk) => ({
        chunkId: chunk.id,
        sourceTitle: chunk.sourceTitle,
        text: chunk.text,
        similarity: chunk.similarity,
      })),
      ungrounded: false,
    });
  }

  /** Writes the quiz without retrieval and saves it as ungrounded, with no excerpts. */
  private async generateUngroundedQuiz(topic: string): Promise<Quiz> {
    const draft = await this.writeDraft(
      buildUngroundedPrompt({ topic, questionCount: this.config.questionsPerQuiz }),
    );
    return this.quizService.createQuiz({
      topic,
      draft,
      excerpts: [],
      ungrounded: true,
    });
  }

  /**
   * Asks the model for a quiz draft, up to the configured number of tries. A
   * try fails when the reply isn't a valid draft or the call times out. Any
   * other error, such as `ModelUnavailableError`, ends generation at once.
   */
  private async writeDraft(messages: ChatMessage[]): Promise<QuizDraft> {
    for (let tryNumber = 1; tryNumber <= this.config.tries; tryNumber++) {
      try {
        const reply = await this.llmClient.chat({
          messages,
          jsonSchema: QUIZ_DRAFT_JSON_SCHEMA,
          sampling: this.config.sampling,
        });
        return parseQuizDraft(reply);
      } catch (error) {
        const tryFailed =
          error instanceof QuizGenerationError || error instanceof ModelTimeoutError;
        if (!tryFailed) {
          throw error;
        }
      }
    }
    throw new QuizGenerationError();
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
