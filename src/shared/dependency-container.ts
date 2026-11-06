import "server-only";

import { loadGenerationConfig } from "@/features/generation/generation.config";
import { GenerationService } from "@/features/generation/generation.service";
import type { GenerationServiceInterface } from "@/features/generation/generation.service.interface";
import { LlmClient } from "@/features/generation/llm-client";
import type { LlmClientInterface } from "@/features/generation/llm-client.interface";
import { QuizRepository } from "@/features/quiz/quiz.repository";
import type { QuizRepositoryInterface } from "@/features/quiz/quiz.repository.interface";
import { QuizService } from "@/features/quiz/quiz.service";
import type { QuizServiceInterface } from "@/features/quiz/quiz.service.interface";
import type { RetrievalServiceInterface } from "@/features/retrieval/retrieval.service.interface";
import { RetrievalServiceStub } from "@/features/retrieval/retrieval.service.stub";
import { prisma } from "@/shared/db/prisma";

// The only place that creates implementations. Everything else depends on the interfaces.

const generationConfig = loadGenerationConfig();

const quizRepository: QuizRepositoryInterface = new QuizRepository(prisma);

// Replace the stub with the group's retriever here once it exists.
const retrievalService: RetrievalServiceInterface = new RetrievalServiceStub();

const llmClient: LlmClientInterface = new LlmClient(generationConfig);

export const quizService: QuizServiceInterface = new QuizService(quizRepository);

export const generationService: GenerationServiceInterface = new GenerationService(
  retrievalService,
  llmClient,
  quizService,
  generationConfig,
);
