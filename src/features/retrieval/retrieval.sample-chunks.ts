import type { Chunk } from "@/features/retrieval/retrieval.model";

/**
 * The five chunks of the two sample sources that `RetrievalServiceStub`
 * serves, one per paragraph. They have no similarity yet, because the stub
 * works it out for each topic.
 */
export const SAMPLE_CHUNKS: Omit<Chunk, "similarity">[] = [
  {
    id: "embeddings-explained-1",
    sourceTitle: "Embeddings explained",
    text: `An embedding is a list of numbers, a vector, that represents a piece of text. An embedding model reads the text and outputs a vector with a fixed number of dimensions, for example 768, no matter how long the text was. Texts with similar meanings get vectors that point in similar directions, even when they share no words. "How do I reset my password?" and "I forgot my login" end up close together, while "Password managers store credentials" ends up further away even though it shares a word with the first. The individual dimensions have no human-readable meaning. Only a vector's position relative to other vectors carries information. The documents and the questions must be embedded with the same model, so switching embedding models means re-embedding every document.`,
  },
  {
    id: "embeddings-explained-2",
    sourceTitle: "Embeddings explained",
    text: `Embedding models are trained with contrastive learning. The model sees pairs of texts that belong together, such as a question and the passage that answers it, and pairs that do not. Training adjusts the model so that matching pairs get vectors close to each other and non-matching pairs get vectors far apart. The training pairs decide what "similar" means to the model. A model trained on search queries and their answers is good at matching questions to passages, while a model trained on paraphrases is good at spotting sentences that say the same thing. Embedding models are much smaller than chat models. EmbeddingGemma, for example, has about 300 million parameters, while even small chat models have billions.`,
  },
  {
    id: "embeddings-explained-3",
    sourceTitle: "Embeddings explained",
    text: `To compare two embeddings, retrieval systems use a similarity measure. Cosine similarity measures the angle between two vectors and ignores their length. It is 1 when they point the same way, 0 when they are perpendicular and -1 when they point in opposite directions. The dot product multiplies matching dimensions and adds up the results, so it depends on both the angle and the lengths of the vectors. When every vector is normalized to length 1, the dot product and cosine similarity produce the same ranking, which is why many systems normalize embeddings once and then use the cheaper dot product. Euclidean distance measures the straight-line distance between two points, and smaller means more similar. For normalized vectors it ranks results in the same order as cosine similarity.`,
  },
  {
    id: "building-a-rag-pipeline-1",
    sourceTitle: "Building a RAG pipeline",
    text: `Before documents can be searched, they are split into chunks, and each chunk gets its own embedding. Chunk size is a trade-off. Large chunks keep more context together, but their embedding blends several ideas into one vector, so a specific question matches them less precisely. Small chunks match precisely but can cut an explanation in half, leaving the retrieved text without the sentence that makes it useful. A common starting point is chunks of a few hundred words with an overlap of 10 to 20 percent, so a sentence near a boundary appears in both neighbouring chunks. Splitting at natural boundaries such as headings and paragraphs usually works better than cutting after a fixed number of characters.`,
  },
  {
    id: "building-a-rag-pipeline-2",
    sourceTitle: "Building a RAG pipeline",
    text: `In retrieval-augmented generation, the request is embedded with the same model as the documents, and the system looks up the chunks whose embeddings are most similar to it. It keeps the top k results, often between 3 and 10. Some systems also apply a similarity threshold and drop chunks below it, so an off-topic request retrieves nothing instead of the least bad matches. The retrieved chunks are added to the prompt, and the language model is told to answer from them. Retrieval quality limits answer quality. If the right chunk is not retrieved, the model either refuses or falls back on what it learned in training, which may be outdated or wrong. Retrieval also costs time, because every retrieved chunk makes the prompt longer, and a longer prompt takes longer to process, especially on a CPU.`,
  },
];
