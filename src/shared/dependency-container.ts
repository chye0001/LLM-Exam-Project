import "server-only";

import { AttemptRepository } from "@/features/attempt/attempt.repository";
import type { AttemptRepositoryInterface } from "@/features/attempt/attempt.repository.interface";
import { AttemptService } from "@/features/attempt/attempt.service";
import type { AttemptServiceInterface } from "@/features/attempt/attempt.service.interface";
import { loadGenerationConfig } from "@/features/generation/generation.config";
import { GenerationService } from "@/features/generation/generation.service";
import type { GenerationServiceInterface } from "@/features/generation/generation.service.interface";
import { LlmClient } from "@/features/generation/generation.llm-client";
import type { LlmClientInterface } from "@/features/generation/generation.llm-client.interface";
import { SourceRepository } from "@/features/ingestion/ingestion.repository";
import type { SourceRepositoryInterface } from "@/features/ingestion/ingestion.repository.interface";
import { IngestionService } from "@/features/ingestion/ingestion.service";
import type { IngestionServiceInterface } from "@/features/ingestion/ingestion.service.interface";
import { QuizRepository } from "@/features/quiz/quiz.repository";
import type { QuizRepositoryInterface } from "@/features/quiz/quiz.repository.interface";
import { QuizService } from "@/features/quiz/quiz.service";
import type { QuizServiceInterface } from "@/features/quiz/quiz.service.interface";
import { loadRetrievalConfig } from "@/features/retrieval/retrieval.config";
import { EmbeddingClient } from "@/features/retrieval/retrieval.embedding-client";
import type { EmbeddingClientInterface } from "@/features/retrieval/retrieval.embedding-client.interface";
import { RetrievalRepository } from "@/features/retrieval/retrieval.repository";
import type { RetrievalRepositoryInterface } from "@/features/retrieval/retrieval.repository.interface";
import type { RetrievalServiceInterface } from "@/features/retrieval/retrieval.service.interface";
import { RetrievalServiceStub } from "@/features/retrieval/retrieval.service.stub";
import { prisma } from "@database/prisma";

// The only place that creates implementations. Everything else depends on the interfaces.

const generationConfig = loadGenerationConfig();

const retrievalConfig = loadRetrievalConfig();

/** Whether `DEMO_MODE=true` lets the student skip retrieval. */
export const demoMode = generationConfig.demoMode;

const quizRepository: QuizRepositoryInterface = new QuizRepository(prisma);

const attemptRepository: AttemptRepositoryInterface = new AttemptRepository(prisma);

const embeddingClient: EmbeddingClientInterface = new EmbeddingClient(retrievalConfig);

const retrievalRepository: RetrievalRepositoryInterface = new RetrievalRepository(
  retrievalConfig,
);

const sourceRepository: SourceRepositoryInterface = new SourceRepository(retrievalConfig);

// Replace the stub with the group's retriever here once it exists.
const retrievalService: RetrievalServiceInterface = new RetrievalServiceStub();

export const ingestionService: IngestionServiceInterface = new IngestionService(
  sourceRepository,
  embeddingClient,
  retrievalRepository,
  retrievalConfig,
);

const llmClient: LlmClientInterface = new LlmClient(generationConfig);

export const quizService: QuizServiceInterface = new QuizService(quizRepository);

export const generationService: GenerationServiceInterface = new GenerationService(
  retrievalService,
  llmClient,
  quizService,
  generationConfig,
);

export const attemptService: AttemptServiceInterface = new AttemptService(
  attemptRepository,
  quizService,
);
