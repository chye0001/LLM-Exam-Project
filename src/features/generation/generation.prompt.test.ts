import { describe, expect, it } from "vitest";

import {
  buildGroundedPrompt,
  buildUngroundedPrompt,
} from "@/features/generation/generation.prompt";
import type { Chunk } from "@/features/retrieval/retrieval.model";

describe("buildGroundedPrompt", () => {
  it("puts Traits, Tone and Target, with the topic, in the system message", () => {
    const [systemMessage] = buildGroundedPrompt({
      topic: "Embeddings",
      chunks: someChunks(),
      questionCount: 5,
    });

    expect(systemMessage).toEqual({
      role: "system",
      content: [
        "You are an experienced teacher who writes fair exam questions. You use only the material you are given, never your own knowledge.",
        "Write in plain, neutral and concise English.",
        "Your readers are students revising Embeddings for an exam. Test whether they understand the ideas in the material, not whether they remember names and numbers.",
      ].join("\n\n"),
    });
  });

  it("puts the Task with the count and the topic, every rule and the numbered chunks in the user message", () => {
    const [, userMessage] = buildGroundedPrompt({
      topic: "Embeddings",
      chunks: someChunks(),
      questionCount: 5,
    });

    expect(userMessage).toEqual({
      role: "user",
      content: `Write 5 multiple-choice questions about "Embeddings" using only the numbered chunks below.

For each question, write:
- question: the question itself
- correctOption: the one correct option
- distractors: three wrong options that sound plausible to someone who skimmed the material
- explanation: one sentence on why the correct option is right, based on the chunks

Rules:
- Every question must be answerable from the chunks alone.
- Exactly one option may be correct.
- Questions may be tricky, for example "Which of these is NOT ..." or distractors that are almost right, as long as the chunks prove the correct option.
- Write options as short phrases, with no letters or numbers in front.
- Respond with JSON only.

Chunks:

[1] (from "Embeddings explained")
An embedding is a list of numbers, a vector, that represents a piece of text.

[2] (from "Building a RAG pipeline")
Some systems also apply a similarity threshold.`,
    });
  });
});

describe("buildUngroundedPrompt", () => {
  it("keeps only the first sentence of Traits, followed by Tone and Target", () => {
    const [systemMessage] = buildUngroundedPrompt({
      topic: "Embeddings",
      questionCount: 5,
    });

    expect(systemMessage).toEqual({
      role: "system",
      content: [
        "You are an experienced teacher who writes fair exam questions.",
        "Write in plain, neutral and concise English.",
        "Your readers are students revising Embeddings for an exam. Test whether they understand the ideas, not whether they remember names and numbers.",
      ].join("\n\n"),
    });
    expect(systemMessage.content.toLowerCase()).not.toContain("material");
  });

  it("puts the Task without chunk rules and without chunks in the user message", () => {
    const [, userMessage] = buildUngroundedPrompt({
      topic: "Embeddings",
      questionCount: 5,
    });

    expect(userMessage).toEqual({
      role: "user",
      content: `Write 5 multiple-choice questions about "Embeddings".

For each question, write:
- question: the question itself
- correctOption: the one correct option
- distractors: three wrong options that sound plausible to someone who only skimmed the topic
- explanation: one sentence on why the correct option is right

Rules:
- Exactly one option may be correct.
- Questions may be tricky, for example "Which of these is NOT ..." or distractors that are almost right.
- Write options as short phrases, with no letters or numbers in front.
- Respond with JSON only.`,
    });
    expect(userMessage.content.toLowerCase()).not.toContain("chunk");
    expect(userMessage.content.toLowerCase()).not.toContain("material");
  });
});

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
