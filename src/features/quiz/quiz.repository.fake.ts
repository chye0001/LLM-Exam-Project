import type { NewQuiz, Quiz, QuizSummary } from "@/features/quiz/quiz.model";
import type { QuizRepositoryInterface } from "@/features/quiz/quiz.repository.interface";

/** Keeps quizzes in memory and assigns ids and dates the way the database does. */
export class QuizRepositoryFake implements QuizRepositoryInterface {
  private readonly quizzes: Quiz[] = [];
  private lastId = 0;
  private lastCreatedAt = 0;

  /** Copies of every quiz saved so far, so tests can check what was left behind. */
  get savedQuizzes(): Quiz[] {
    return structuredClone(this.quizzes);
  }

  async create({ questions, excerpts, ...quiz }: NewQuiz): Promise<Quiz> {
    const saved: Quiz = {
      ...quiz,
      id: this.nextId("quiz"),
      createdAt: this.nextCreatedAt(),
      questions: questions.map(({ options, ...question }) => ({
        ...question,
        id: this.nextId("question"),
        options: options.map((option) => ({
          ...option,
          id: this.nextId("option"),
        })),
      })),
      excerpts: excerpts.map((excerpt) => ({
        ...excerpt,
        id: this.nextId("excerpt"),
      })),
    };
    this.quizzes.push(saved);
    return structuredClone(saved);
  }

  async findById(id: string): Promise<Quiz | null> {
    const quiz = this.quizzes.find((saved) => saved.id === id);
    return quiz ? structuredClone(quiz) : null;
  }

  async findAllSummaries(): Promise<QuizSummary[]> {
    return this.quizzes.map((quiz) => ({
      id: quiz.id,
      topic: quiz.topic,
      questionCount: quiz.questions.length,
      createdAt: new Date(quiz.createdAt),
    }));
  }

  private nextId(prefix: string): string {
    this.lastId += 1;
    return `${prefix}-${this.lastId}`;
  }

  /** The current time, but always later than the last quiz, so "newest first" is well defined in tests. */
  private nextCreatedAt(): Date {
    this.lastCreatedAt = Math.max(Date.now(), this.lastCreatedAt + 1);
    return new Date(this.lastCreatedAt);
  }
}
