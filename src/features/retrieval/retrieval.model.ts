import { z } from "zod";

/** What the vector database stores with every chunk, next to its vector. */
export const chunkPayloadSchema = z.object({
  /** Stable within the knowledge base, such as `embeddings-explained-3`. */
  chunkId: z.string(),
  /** The source's file name, such as `embeddings-explained.md`. */
  sourceName: z.string(),
  sourceTitle: z.string(),
  /** The chunk's place in its source, counted from 1. */
  position: z.number().int(),
  headingPath: z.string(),
  text: z.string(),
  /** The hash of the source content the chunk was cut from. */
  contentHash: z.string(),
  /** The model that made the chunk's vector. Vectors from different models can't be compared. */
  embeddingModel: z.string(),
});

export type ChunkPayload = z.infer<typeof chunkPayloadSchema>;

/** A chunk with its vector, ready to be stored. */
export type ChunkRecord = ChunkPayload & { vector: number[] };

/** Which version of a source the stored chunks came from. */
export type SourceVersion = Pick<
  ChunkPayload,
  "sourceName" | "contentHash" | "embeddingModel"
>;

/** A piece of a source that retrieval returned for a topic. */
export type Chunk = {
  /** Stable within the knowledge base, so an excerpt can name the chunk it copies. */
  id: string;
  text: string;
  sourceTitle: string;
  /** How closely the chunk matches the topic. Higher means a closer match. */
  similarity: number;
};
