import type { Chunk } from "@/features/retrieval/retrieval.model";
import { SAMPLE_CHUNKS } from "@/features/retrieval/retrieval.sample-chunks";
import type { RetrievalServiceInterface } from "@/features/retrieval/retrieval.service.interface";

/** Common words that say nothing about what a topic is about. */
const COMMON_WORDS = new Set([
  "a", "about", "an", "and", "are", "as", "at", "be", "by", "can", "do",
  "does", "for", "from", "how", "i", "in", "into", "is", "it", "its", "me",
  "my", "of", "on", "or", "so", "than", "that", "the", "their", "them",
  "then", "these", "they", "this", "those", "to", "was", "we", "what",
  "when", "where", "which", "who", "why", "with", "you", "your",
]);

/**
 * Stands in for the group's retriever until it exists. It serves the five
 * chunks of the two sample sources and matches them by shared words instead
 * of embeddings, counting the source's title as part of each chunk. A chunk's
 * similarity is the share of the topic's meaningful words it contains, and a
 * chunk that contains none of them doesn't match.
 */
export class RetrievalServiceStub implements RetrievalServiceInterface {
  async retrieve(topic: string, limit: number): Promise<Chunk[]> {
    const topicWords = new Set(meaningfulWords(topic));
    if (topicWords.size === 0) {
      return [];
    }

    return SAMPLE_CHUNKS.map((chunk) => {
      const chunkWords = new Set(
        meaningfulWords(`${chunk.sourceTitle} ${chunk.text}`),
      );
      const sharedWords = [...topicWords].filter((word) => chunkWords.has(word));
      return { ...chunk, similarity: sharedWords.length / topicWords.size };
    })
      .filter((chunk) => chunk.similarity > 0)
      .toSorted((first, second) => second.similarity - first.similarity)
      .slice(0, limit);
  }
}

/**
 * The text's words in lower case, without common words. A trailing "s" is
 * dropped, so "embedding" and "embeddings" count as the same word.
 */
function meaningfulWords(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [])
    .filter((word) => !COMMON_WORDS.has(word))
    .map((word) => (word.length > 3 ? word.replace(/s$/, "") : word));
}
