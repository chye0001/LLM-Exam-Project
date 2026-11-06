// Saves one sample quiz through the quiz service and prints its id.
// Run it with `npm run db:seed`. The dependency container imports `server-only`,
// so the script runs with the `react-server` export condition.

import type { NewExcerpt, QuizDraft } from "@/features/quiz/quiz.model";
import { quizService } from "@/shared/dependency-container";

const topic = "Cosine similarity";

const draft: QuizDraft = {
  questions: [
    {
      question: "What does cosine similarity measure?",
      correctOption: "The angle between two vectors",
      distractors: [
        "The straight-line distance between two points",
        "The sum of the products of matching dimensions",
        "The number of words two texts share",
      ],
      explanation:
        "Cosine similarity measures the angle between two vectors and ignores their length.",
    },
    {
      question: "Which of these is NOT true of the dot product?",
      correctOption: "It ignores the lengths of the vectors",
      distractors: [
        "It multiplies matching dimensions and adds up the results",
        "It depends on the angle between the vectors",
        "It ranks like cosine similarity when vectors are normalized",
      ],
      explanation:
        "The dot product depends on both the angle and the lengths of the vectors.",
    },
    {
      question: "Why do many systems normalize embeddings to length 1?",
      correctOption: "So the cheaper dot product ranks results like cosine similarity",
      distractors: [
        "So Euclidean distance grows for similar texts",
        "So every embedding gets more dimensions",
        "So no similarity threshold is needed",
      ],
      explanation:
        "For vectors of length 1, the dot product and cosine similarity produce the same ranking.",
    },
    {
      question: "What does a similarity threshold do during retrieval?",
      correctOption: "It drops chunks that match the request too weakly",
      distractors: [
        "It keeps exactly the top k chunks",
        "It splits documents at headings and paragraphs",
        "It limits how long the prompt can get",
      ],
      explanation:
        "Chunks below the threshold are dropped, so an off-topic request retrieves nothing instead of the least bad matches.",
    },
    {
      question: "What can happen when the right chunk isn't retrieved?",
      correctOption: "The model refuses or falls back on its training data",
      distractors: [
        "The model still answers from the missing chunk",
        "The documents are embedded again automatically",
        "The prompt gets shorter and faster to process",
      ],
      explanation:
        "Without the right chunk, the model either refuses or falls back on what it learned in training, which may be outdated or wrong.",
    },
  ],
};

const excerpts: NewExcerpt[] = [
  {
    chunkId: "embeddings-explained-3",
    sourceTitle: "Embeddings explained",
    text: "To compare two embeddings, retrieval systems use a similarity measure. Cosine similarity measures the angle between two vectors and ignores their length. It is 1 when they point the same way, 0 when they are perpendicular and -1 when they point in opposite directions. The dot product multiplies matching dimensions and adds up the results, so it depends on both the angle and the lengths of the vectors. When every vector is normalized to length 1, the dot product and cosine similarity produce the same ranking, which is why many systems normalize embeddings once and then use the cheaper dot product. Euclidean distance measures the straight-line distance between two points, and smaller means more similar. For normalized vectors it ranks results in the same order as cosine similarity.",
    similarity: 1,
  },
  {
    chunkId: "building-a-rag-pipeline-2",
    sourceTitle: "Building a RAG pipeline",
    text: "In retrieval-augmented generation, the request is embedded with the same model as the documents, and the system looks up the chunks whose embeddings are most similar to it. It keeps the top k results, often between 3 and 10. Some systems also apply a similarity threshold and drop chunks below it, so an off-topic request retrieves nothing instead of the least bad matches. The retrieved chunks are added to the prompt, and the language model is told to answer from them. Retrieval quality limits answer quality. If the right chunk is not retrieved, the model either refuses or falls back on what it learned in training, which may be outdated or wrong. Retrieval also costs time, because every retrieved chunk makes the prompt longer, and a longer prompt takes longer to process, especially on a CPU.",
    similarity: 0.5,
  },
];

async function main() {
  const quiz = await quizService.createQuiz({
    topic,
    draft,
    excerpts,
    ungrounded: false,
  });
  console.log(`Saved the sample quiz "${quiz.topic}" with id ${quiz.id}`);
  console.log(`Open it at http://localhost:3000/quizzes/${quiz.id}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
