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

  async create({ questions, excerpts, ...quiz }: NewQuiz): Promise<Quiz> {
    const saved: Quiz = {
      ...quiz,
      id: this.nextId("quiz"),
      createdAt: new Date(),
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

  private nextId(prefix: string): string {
    this.lastId += 1;
    return `${prefix}-${this.lastId}`;
  }
}
