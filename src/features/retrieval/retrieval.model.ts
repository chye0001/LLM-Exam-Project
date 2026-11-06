/** A piece of a source that retrieval returned for a topic. */
export type Chunk = {
  /** Stable within the knowledge base, so an excerpt can name the chunk it copies. */
  id: string;
  text: string;
  sourceTitle: string;
  /** How closely the chunk matches the topic. Higher means a closer match. */
  similarity: number;
};
