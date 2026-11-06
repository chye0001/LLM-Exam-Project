import type { NewQuiz, Quiz } from "@/features/quiz/quiz.model";
import type { QuizRepositoryInterface } from "@/features/quiz/quiz.repository.interface";

/** Keeps quizzes in memory and assigns ids and dates the way the database does. */
export class QuizRepositoryFake implements QuizRepositoryInterface {
  private readonly quizzes: Quiz[] = [];
  private lastId = 0;

  /** Copies of every quiz saved so far, so tests can check what was left behind. */
  get savedQuizzes(): Quiz[] {
    return structuredClone(this.quizzes);
  }

  async create(quiz: NewQuiz): Promise<Quiz> {
    const saved: Quiz = {
      id: this.nextId("quiz"),
      topic: quiz.topic,
      ungrounded: quiz.ungrounded,
      createdAt: new Date(),
      questions: quiz.questions.map((question) => ({
        id: this.nextId("question"),
        text: question.text,
        explanation: question.explanation,
        options: question.options.map((option) => ({
          id: this.nextId("option"),
          text: option.text,
          isCorrect: option.isCorrect,
        })),
      })),
      excerpts: quiz.excerpts.map((excerpt) => ({
        id: this.nextId("excerpt"),
        chunkId: excerpt.chunkId,
        sourceTitle: excerpt.sourceTitle,
        text: excerpt.text,
        similarity: excerpt.similarity,
      })),
    };
    this.quizzes.push(saved);
    return structuredClone(saved);
  }

  async findById(id: string): Promise<Quiz | null> {
    const quiz = this.quizzes.find((saved) => saved.id === id);
    return quiz ? structuredClone(quiz) : null;
  }

  private nextId(prefix: string): string {
    this.lastId += 1;
    return `${prefix}-${this.lastId}`;
  }
}
