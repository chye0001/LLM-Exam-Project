import { z } from "zod";

const TOPIC_LENGTH_MESSAGE = "Enter a topic between 2 and 100 characters.";

/** A topic the student typed, without surrounding spaces. */
export const topicSchema = z
  .string()
  .trim()
  .min(2, TOPIC_LENGTH_MESSAGE)
  .max(100, TOPIC_LENGTH_MESSAGE);

export type GenerateQuizInput = {
  topic: string;
  /** Writes the quiz without retrieval. Only allowed in demo mode. */
  skipRetrieval?: boolean;
};

/** One message in a chat with the model. The roles are the chat API's. */
export type ChatMessage = {
  role: "system" | "user";
  content: string;
};

/** How the model picks its words, and how much text it can read at once. */
export type SamplingOptions = {
  contextWindow: number;
  temperature: number;
  topP: number;
  topK: number;
};
