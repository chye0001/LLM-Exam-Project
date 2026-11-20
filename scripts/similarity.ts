// Prints the 10 chunks closest to each topic with their cosine similarity,
// ignoring the threshold, and marks the ones retrieval would return. Use it to
// calibrate the threshold and to show how retrieval scores topics:
//
//   npm run retrieval:scores -- "cosine similarity" "the French Revolution"
//
// It needs Qdrant with the knowledge base ingested and Ollama with the
// embedding model. The dependency container imports `server-only`, so the
// script runs with the `react-server` export condition.

import { DEFAULT_GENERATION_CONFIG } from "@/features/generation/generation.config";
import { loadRetrievalConfig } from "@/features/retrieval/retrieval.config";
import { unfilteredRetrievalService } from "@/shared/dependency-container";
import { AppError } from "@/shared/errors";

const CHUNKS_SHOWN = 10;

async function main() {
  const topics = process.argv.slice(2);
  if (topics.length === 0) {
    console.error('Name at least one topic: npm run retrieval:scores -- "cosine similarity"');
    process.exitCode = 1;
    return;
  }

  const { similarityThreshold, embeddingModel } = loadRetrievalConfig();
  const { chunksPerRetrieval } = DEFAULT_GENERATION_CONFIG;
  console.log(
    `Threshold ${similarityThreshold} with ${embeddingModel}. "*" marks the chunks retrieval returns (at most ${chunksPerRetrieval}).`,
  );

  for (const topic of topics) {
    const chunks = await unfilteredRetrievalService.retrieve(topic, CHUNKS_SHOWN);
    console.log(`\n${topic}`);
    chunks.forEach((chunk, index) => {
      const returned = chunk.similarity >= similarityThreshold && index < chunksPerRetrieval;
      console.log(
        `  ${returned ? "*" : " "} ${chunk.similarity.toFixed(3)}  ${chunk.id}  (${chunk.sourceTitle})`,
      );
    });
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof AppError ? `Scoring failed: ${error.message}` : error);
  process.exitCode = 1;
});
