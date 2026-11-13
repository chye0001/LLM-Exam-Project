# Qdrant and all-minilm for the knowledge base

The knowledge base is markdown files in `knowledge-base/`. The app splits them into chunks along their headings, embeds every chunk with `all-minilm` in the Ollama that already runs the chat model, and stores the chunks with their embeddings in Qdrant. SQLite keeps only quiz data. Qdrant runs as its own container, about 45 MB of memory with the sample sources, and is reached through the official JavaScript client from `RetrievalRepository`, the only file that imports it. We rejected LanceDB, which runs inside the Node process, because its native module may not build on the Alpine image and it has no dashboard. We rejected Chroma because its server is Python and needs more memory than Qdrant. Qdrant's dashboard also lets the group show the stored chunks at the exam.

`all-minilm` (384 dimensions, 45 MB) fits next to the chat model on a laptop with 7.8 GB of RAM. In Ollama it reads at most 256 tokens. Chunks are therefore at most 800 characters with 120 characters of overlap, not the few hundred words that common guides suggest, and the embedding call fails instead of cutting a text that is too long. The longest sample chunk is 147 tokens. PDFs are out of scope, because extracting clean text from them adds work the MVP doesn't need.

Ingestion runs when the server starts, through `register()` in `src/instrumentation.ts`, and on demand with `npm run ingest`. It skips sources whose content hash and embedding model match the stored chunks, so restarts stay fast. If Qdrant or Ollama is down, the app still starts, and retrieval reports the problem when a student asks for a quiz.

Retrieval keeps chunks with a cosine similarity of at least 0.27. We measured 22 topics with `npm run retrieval:scores` against the two sample sources. Covered topics scored at least 0.294, and uncovered topics at most 0.248, the highest being "neural network training". 0.27 is the middle of that gap. One covered paraphrase, "turning text into numbers", scored 0.166, below the unrelated "Danish grammar" at 0.192. No threshold can keep it while rejecting unrelated topics, which is a limit of a small embedding model. The threshold depends on the model and the material, so it has to be measured again when either changes.

The measurements, made on 2026-11-13 against the 7 chunks of the two sample sources. "Best" is the highest similarity of any chunk:

| Covered topic | Best | Uncovered topic | Best |
|---|---|---|---|
| dot product and euclidean distance | 0.597 | neural network training | 0.248 |
| why split documents into smaller pieces (paraphrase) | 0.555 | Danish grammar | 0.192 |
| chunk size and overlap | 0.494 | pasta recipes | 0.163 |
| how a search model learns which texts belong together (paraphrase) | 0.476 | SQL database indexes | 0.101 |
| retrieval-augmented generation | 0.454 | linear regression | 0.058 |
| cosine similarity | 0.433 | how to change a car tyre | 0.057 |
| similarity threshold | 0.326 | stock market investing | 0.055 |
| how do I compare two vectors (paraphrase) | 0.314 | photosynthesis | 0.044 |
| contrastive learning | 0.294 | World War II | 0.043 |
| turning text into numbers (paraphrase) | 0.166 | JavaScript promises | 0.041 |
| | | the French Revolution | 0.040 |
| | | football rules | 0.034 |
