import "server-only";

import { QuizRepository } from "@/features/quiz/quiz.repository";
import type { QuizRepositoryInterface } from "@/features/quiz/quiz.repository.interface";
import { QuizService } from "@/features/quiz/quiz.service";
import type { QuizServiceInterface } from "@/features/quiz/quiz.service.interface";
import { prisma } from "@/shared/db/prisma";

// The only place that creates implementations. Everything else depends on the interfaces.

const quizRepository: QuizRepositoryInterface = new QuizRepository(prisma);

export const quizService: QuizServiceInterface = new QuizService(quizRepository);
