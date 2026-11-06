import type { ChatMessage } from "@/features/generation/generation.model";
import type { Chunk } from "@/features/retrieval/retrieval.model";

// The prompt is built from the 4T's. Traits, Tone and Target go in the system
// message, and the Task goes in the user message, followed by the chunks.
//
// The ungrounded variant is only used when retrieval is skipped in demo mode.
// It drops everything that refers to the material or the chunks, as the spec
// lists it: the second sentence of Traits, the chunk rules and the chunks.

const TRAITS_FIRST_SENTENCE =
  "You are an experienced teacher who writes fair exam questions.";

const TRAITS = `${TRAITS_FIRST_SENTENCE} You use only the material you are given, never your own knowledge.`;

const TONE = "Write in plain, neutral and concise English.";

function target(topic: string): string {
  return `Your readers are students revising ${topic} for an exam. Test whether they understand the ideas in the material, not whether they remember names and numbers.`;
}

function groundedTask(topic: string, questionCount: number): string {
  return `Write ${questionCount} multiple-choice questions about "${topic}" using only the numbered chunks below.

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
- Respond with JSON only.`;
}

function ungroundedTask(topic: string, questionCount: number): string {
  return `Write ${questionCount} multiple-choice questions about "${topic}".

For each question, write:
- question: the question itself
- correctOption: the one correct option
- distractors: three wrong options that sound plausible to someone who skimmed the material
- explanation: one sentence on why the correct option is right

Rules:
- Exactly one option may be correct.
- Questions may be tricky, for example "Which of these is NOT ..." or distractors that are almost right.
- Write options as short phrases, with no letters or numbers in front.
- Respond with JSON only.`;
}

/** Numbers the chunks from 1, in retrieval order, so the model can tell them apart. */
function chunksSection(chunks: Chunk[]): string {
  const numberedChunks = chunks.map(
    (chunk, index) => `[${index + 1}] (from "${chunk.sourceTitle}")\n${chunk.text}`,
  );
  return ["Chunks:", ...numberedChunks].join("\n\n");
}

export type GroundedPromptInput = {
  topic: string;
  chunks: Chunk[];
  questionCount: number;
};

/** Returns the system and user messages that ask the model for a quiz draft written only from the chunks. */
export function buildGroundedPrompt({
  topic,
  chunks,
  questionCount,
}: GroundedPromptInput): [ChatMessage, ChatMessage] {
  return [
    { role: "system", content: [TRAITS, TONE, target(topic)].join("\n\n") },
    {
      role: "user",
      content: [groundedTask(topic, questionCount), chunksSection(chunks)].join("\n\n"),
    },
  ];
}

export type UngroundedPromptInput = {
  topic: string;
  questionCount: number;
};

/**
 * Returns the system and user messages that ask the model for a quiz draft
 * without any chunks, so it writes from its own knowledge. Only demo mode
 * uses it, to show what retrieval changes.
 */
export function buildUngroundedPrompt({
  topic,
  questionCount,
}: UngroundedPromptInput): [ChatMessage, ChatMessage] {
  return [
    {
      role: "system",
      content: [TRAITS_FIRST_SENTENCE, TONE, target(topic)].join("\n\n"),
    },
    { role: "user", content: ungroundedTask(topic, questionCount) },
  ];
}
