import { beforeEach, describe, expect, it } from "vitest";

import {
  DEFAULT_GENERATION_CONFIG,
  type GenerationConfig,
} from "@/features/generation/generation.config";
import { buildUngroundedPrompt } from "@/features/generation/generation.prompt";
import { GenerationService } from "@/features/generation/generation.service";
import type { GenerationServiceInterface } from "@/features/generation/generation.service.interface";
import { LlmClientFake } from "@test/features/generation/generation.llm-client.fake";
import type { QuizDraft } from "@/features/quiz/quiz.model";
import { QuizRepositoryFake } from "@test/features/quiz/quiz.repository.fake";
import { QuizService } from "@/features/quiz/quiz.service";
import type { Chunk } from "@/features/retrieval/retrieval.model";
import { RetrievalServiceFake } from "@test/features/retrieval/retrieval.service.fake";
import {
  ModelUnavailableError,
  NoRelevantSourcesError,
  QuizGenerationError,
  ValidationError,
} from "@/shared/errors";

describe("GenerationService", () => {
  let quizRepository: QuizRepositoryFake;
  let llmClient: LlmClientFake;

  beforeEach(() => {
    quizRepository = new QuizRepositoryFake();
    llmClient = new LlmClientFake();
  });

  /** Wires the real services the way the dependency container does, with fakes at the edges. */
  function aGenerationService(
    chunks: Chunk[],
    config: GenerationConfig = DEFAULT_GENERATION_CONFIG,
  ): GenerationServiceInterface {
    return new GenerationService(
      new RetrievalServiceFake(chunks),
      llmClient,
      new QuizService(quizRepository),
      config,
    );
  }

  it("saves the model's quiz under the topic with one excerpt per chunk", async () => {
    llmClient.queueReply(JSON.stringify(aDraft()));
    const generationService = aGenerationService(someChunks());

    const quiz = await generationService.generateQuiz({ topic: "Embeddings" });

    expect(quiz.topic).toBe("Embeddings");
    expect(quiz.ungrounded).toBe(false);
    expect(quiz.questions.map((question) => question.text)).toEqual([
      "What is idea 1?",
      "What is idea 2?",
      "What is idea 3?",
      "What is idea 4?",
      "What is idea 5?",
    ]);
    expect(quiz.questions.map((question) => question.explanation)).toEqual([
      "Idea 1 is explained in the chunks.",
      "Idea 2 is explained in the chunks.",
      "Idea 3 is explained in the chunks.",
      "Idea 4 is explained in the chunks.",
      "Idea 5 is explained in the chunks.",
    ]);
    quiz.questions.forEach((question) => {
      expect(question.options).toHaveLength(4);
      expect(question.options.filter((option) => option.isCorrect)).toHaveLength(1);
    });
    expect(quiz.excerpts).toMatchObject([
      {
        chunkId: "embeddings-explained-1",
        sourceTitle: "Embeddings explained",
        text: "An embedding is a list of numbers, a vector, that represents a piece of text.",
        similarity: 1,
      },
      {
        chunkId: "building-a-rag-pipeline-2",
        sourceTitle: "Building a RAG pipeline",
        text: "Some systems also apply a similarity threshold.",
        similarity: 0.5,
      },
    ]);
    expect(quizRepository.savedQuizzes).toEqual([quiz]);
  });

  it("refuses with NoRelevantSourcesError when retrieval finds nothing, without asking the model", async () => {
    // No reply is queued, so a model call would fail the test.
    const generationService = aGenerationService([]);

    const result = generationService.generateQuiz({ topic: "The French Revolution" });

    await expect(result).rejects.toThrow(NoRelevantSourcesError);
    await expect(result).rejects.toThrow(
      "Nothing in the knowledge base matches this topic.",
    );
    await expect(result).rejects.toMatchObject({ code: "NO_RELEVANT_SOURCES" });
    expect(quizRepository.savedQuizzes).toEqual([]);
  });

  it.each([
    { kind: "a reply that isn't JSON", reply: '{"questions": [' },
    {
      kind: "a draft with four questions",
      reply: JSON.stringify({ questions: aDraft().questions.slice(0, 4) }),
    },
    {
      kind: "a draft with an empty explanation",
      reply: JSON.stringify(
        withChange(aDraft(), (draft) => (draft.questions[2].explanation = "")),
      ),
    },
    {
      kind: "a draft with two options that are the same",
      reply: JSON.stringify(
        withChange(
          aDraft(),
          (draft) => (draft.questions[0].distractors[0] = "The right answer to 1."),
        ),
      ),
    },
    {
      kind: "a draft with a labeled option",
      reply: JSON.stringify(
        withChange(
          aDraft(),
          (draft) => (draft.questions[4].correctOption = "A) The right answer to 5"),
        ),
      ),
    },
  ])("rejects $kind three times in a row with QuizGenerationError and saves nothing", async ({ reply }) => {
    llmClient.queueReply(reply);
    llmClient.queueReply(reply);
    llmClient.queueReply(reply);
    const generationService = aGenerationService(someChunks());

    const result = generationService.generateQuiz({ topic: "Embeddings" });

    await expect(result).rejects.toThrow(QuizGenerationError);
    await expect(result).rejects.toThrow(
      "The model couldn't write a valid quiz. Try again or rephrase the topic.",
    );
    await expect(result).rejects.toMatchObject({ code: "QUIZ_GENERATION_FAILED" });
    expect(quizRepository.savedQuizzes).toEqual([]);
  });

  describe("the model's tries", () => {
    it("saves the quiz when an invalid first reply is followed by a valid one", async () => {
      llmClient.queueReply('{"questions": [');
      llmClient.queueReply(JSON.stringify(aDraft()));
      const generationService = aGenerationService(someChunks());

      const quiz = await generationService.generateQuiz({ topic: "Embeddings" });

      expect(quiz.questions).toHaveLength(5);
      expect(quizRepository.savedQuizzes).toEqual([quiz]);
    });

    it("counts a timeout as a failed try", async () => {
      llmClient.queueTimeout();
      llmClient.queueReply(JSON.stringify(aDraft()));
      const generationService = aGenerationService(someChunks());

      const quiz = await generationService.generateQuiz({ topic: "Embeddings" });

      expect(quizRepository.savedQuizzes).toEqual([quiz]);
    });

    it("throws QuizGenerationError after three timeouts", async () => {
      llmClient.queueTimeout();
      llmClient.queueTimeout();
      llmClient.queueTimeout();
      const generationService = aGenerationService(someChunks());

      const result = generationService.generateQuiz({ topic: "Embeddings" });

      await expect(result).rejects.toThrow(QuizGenerationError);
      expect(quizRepository.savedQuizzes).toEqual([]);
    });

    it("throws ModelUnavailableError at once when the model can't be reached", async () => {
      // Only one reply is queued, so a retry would fail the test.
      llmClient.queueUnavailable();
      const generationService = aGenerationService(someChunks());

      const result = generationService.generateQuiz({ topic: "Embeddings" });

      await expect(result).rejects.toThrow(ModelUnavailableError);
      await expect(result).rejects.toThrow(
        "The local model isn't reachable. Check that Ollama is running.",
      );
      await expect(result).rejects.toMatchObject({ code: "MODEL_UNAVAILABLE" });
      expect(quizRepository.savedQuizzes).toEqual([]);
    });
  });

  describe("skipping retrieval", () => {
    it("saves an ungrounded quiz without excerpts in demo mode, written from the ungrounded prompt", async () => {
      llmClient.queueReply(JSON.stringify(aDraft()));
      // Retrieval finds nothing, so the quiz can only succeed without consulting it.
      const generationService = aGenerationService([], {
        ...DEFAULT_GENERATION_CONFIG,
        demoMode: true,
      });

      const quiz = await generationService.generateQuiz({
        topic: "Embeddings",
        skipRetrieval: true,
      });

      expect(quiz.topic).toBe("Embeddings");
      expect(quiz.ungrounded).toBe(true);
      expect(quiz.excerpts).toEqual([]);
      expect(quiz.questions).toHaveLength(5);
      expect(quizRepository.savedQuizzes).toEqual([quiz]);
      expect(llmClient.requests.map((request) => request.messages)).toEqual([
        buildUngroundedPrompt({ topic: "Embeddings", questionCount: 5 }),
      ]);
    });

    it("is rejected with ValidationError outside demo mode", async () => {
      // No reply is queued, so the request must be rejected before the model is asked.
      const generationService = aGenerationService(someChunks(), {
        ...DEFAULT_GENERATION_CONFIG,
        demoMode: false,
      });

      const result = generationService.generateQuiz({
        topic: "Embeddings",
        skipRetrieval: true,
      });

      await expect(result).rejects.toThrow(ValidationError);
      await expect(result).rejects.toThrow(
        "Skipping retrieval is only allowed in demo mode.",
      );
      expect(quizRepository.savedQuizzes).toEqual([]);
    });
  });

  describe("the topic", () => {
    it("is trimmed before it becomes the quiz's title", async () => {
      llmClient.queueReply(JSON.stringify(aDraft()));
      const generationService = aGenerationService(someChunks());

      const quiz = await generationService.generateQuiz({ topic: "  Embeddings \n" });

      expect(quiz.topic).toBe("Embeddings");
    });

    it.each([
      { length: 2, topic: "AI" },
      { length: 100, topic: "a".repeat(100) },
    ])("may be $length characters long", async ({ topic }) => {
      llmClient.queueReply(JSON.stringify(aDraft()));
      const generationService = aGenerationService(someChunks());

      const quiz = await generationService.generateQuiz({ topic: ` ${topic} ` });

      expect(quiz.topic).toBe(topic);
    });

    it.each([
      { kind: "empty", topic: "" },
      { kind: "only spaces", topic: "    " },
      { kind: "1 character long after trimming", topic: "  a  " },
      { kind: "101 characters long", topic: "a".repeat(101) },
    ])("is rejected with ValidationError when it is $kind", async ({ topic }) => {
      // No reply is queued, so the topic must be rejected before the model is asked.
      const generationService = aGenerationService(someChunks());

      const result = generationService.generateQuiz({ topic });

      await expect(result).rejects.toThrow(ValidationError);
      await expect(result).rejects.toThrow(
        "Enter a topic between 2 and 100 characters.",
      );
      expect(quizRepository.savedQuizzes).toEqual([]);
    });
  });
});

function withChange(draft: QuizDraft, change: (draft: QuizDraft) => void): QuizDraft {
  change(draft);
  return draft;
}

function aDraft(): QuizDraft {
  return {
    questions: [1, 2, 3, 4, 5].map((number) => ({
      question: `What is idea ${number}?`,
      correctOption: `The right answer to ${number}`,
      distractors: [
        `A wrong answer to ${number}`,
        `Another wrong answer to ${number}`,
        `A third wrong answer to ${number}`,
      ],
      explanation: `Idea ${number} is explained in the chunks.`,
    })),
  };
}

function someChunks(): Chunk[] {
  return [
    {
      id: "embeddings-explained-1",
      sourceTitle: "Embeddings explained",
      text: "An embedding is a list of numbers, a vector, that represents a piece of text.",
      similarity: 1,
    },
    {
      id: "building-a-rag-pipeline-2",
      sourceTitle: "Building a RAG pipeline",
      text: "Some systems also apply a similarity threshold.",
      similarity: 0.5,
    },
  ];
}
