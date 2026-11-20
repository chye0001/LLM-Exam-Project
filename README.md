# LLM-Exam-Project

A local quiz app for students revising for an exam. The student types a topic, the app retrieves the matching chunks from the knowledge base, and a local model in Ollama writes a five-question multiple-choice quiz from those chunks. If nothing in the knowledge base matches the topic, the app says so instead of letting the model write from its training data.

Everything runs on your machine. Next.js serves the app, Ollama runs the chat model and the embedding model, Qdrant stores the knowledge base's chunks and their embeddings, and SQLite stores quizzes and attempts.

## Prerequisites

- [Git](https://git-scm.com/).
- [Docker](https://docs.docker.com/get-docker/) with Compose v2 or later (`docker compose`), to run the whole project in containers.
- [Node.js](https://nodejs.org/) 24 with npm, to develop and to run the tests. The Docker image uses Node 24 too.
- [Ollama](https://ollama.com/download) installed natively, for development and for the low-memory fallback. Docker Compose doesn't need it.
- About 4 GB of free memory for Docker with the default models, plus about 8 GB of disk: the Ollama image is about 5 GB, the app image about 1 GB, the chat model 1.4 GB, the Qdrant image 193 MB and the embedding model 45 MB. Measured with the sample sources, Qdrant uses about 45 MB of memory and the loaded embedding model about 50 MB, so nearly all of it goes to the chat model. The app runs both models on the CPU, so it needs no GPU.

## Installation

```bash
git clone https://github.com/chye0001/LLM-Exam-Project.git
cd LLM-Exam-Project
cp .env.example .env
```

That is all Docker Compose needs. For development and testing, also install the dependencies:

```bash
npm install
```

`npm install` also generates the Prisma client into `database/generated/`.

## Configuration

The app reads these environment variables. `.env.example` lists them with their defaults, and `cp .env.example .env` gives you a working setup. Every variable is optional.

| Variable | Default | What it does |
| --- | --- | --- |
| `OLLAMA_MODEL` | `qwen3:1.7b` | The Ollama model that writes quizzes. |
| `OLLAMA_EMBEDDING_MODEL` | `all-minilm` | The Ollama model that embeds chunks and topics. See [Changing the embedding model](#changing-the-embedding-model). |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Where Ollama runs. Docker Compose sets it to its own Ollama service and ignores `.env` for it. |
| `QDRANT_URL` | `http://localhost:6333` | Where Qdrant runs. Docker Compose sets it to its own Qdrant service and ignores `.env` for it. |
| `KNOWLEDGE_BASE_DIR` | `knowledge-base` | The folder of markdown sources, relative to the project root. |
| `DEMO_MODE` | `false` | `true` shows the "Skip retrieval" checkbox. See [Demo mode](#demo-mode). |
| `DATABASE_URL` | `file:./database/data/quiz.db` | Where the SQLite file lives, relative to the project root. Docker Compose sets it and ignores `.env` for it. |
| `APP_PORT` | `3000` | Docker Compose only. The port on your machine, when 3000 is taken. |
| `QDRANT_PORT` | `6333` | Docker Compose only. The port on your machine for Qdrant's API and dashboard. |

Docker Compose reads `OLLAMA_MODEL`, `OLLAMA_EMBEDDING_MODEL`, `DEMO_MODE`, `APP_PORT` and `QDRANT_PORT` from your shell or from the `.env` file next to `compose.yaml`. The dev server and the `npm run` scripts read `.env` too.

The other generation settings live in `DEFAULT_GENERATION_CONFIG` in `src/features/generation/generation.config.ts`: five questions per quiz, at most five chunks per retrieval, a 4,096-token context window, temperature 0.7, top-p 0.8 and top-k 20, a 3-minute timeout per model call and three tries.

The other retrieval settings live in `DEFAULT_RETRIEVAL_CONFIG` in `src/features/retrieval/retrieval.config.ts`: the Qdrant collection `chunks`, chunks of at most 800 characters with 120 characters of overlap, a similarity threshold of 0.27, 32 texts per embedding call and a 1-minute timeout per call.

## Model setup

The default model is `qwen3:1.7b`, a 1.4 GB download. It was picked because the development laptop has 7.8 GB of RAM and runs Ollama on the CPU. Expect a minute or more per quiz on a laptop. The app turns thinking off for every call.

The embedding model is `all-minilm`, a 45 MB download that turns text into vectors of 384 numbers. Ingestion and retrieval use it, never the chat model.

With Docker Compose, the `ollama-pull` service downloads both models the first time you start the project, so you have nothing to do.

For development and the fallback, pull them into your native Ollama:

```bash
ollama pull qwen3:1.7b
```

```bash
ollama pull all-minilm
```

To try a bigger chat model on a machine with more memory, pull it and set `OLLAMA_MODEL`, for example `OLLAMA_MODEL=qwen3:4b`.

## Loading RAG material

The knowledge base is the markdown files in `knowledge-base/`. It ships with two sample sources: "Embeddings explained", on what embeddings are, how embedding models are trained and how vectors are compared, and "Building a RAG pipeline", on chunking and retrieval. The app loads them into Qdrant by itself when it starts, so with Docker Compose there is nothing to do.

### Adding a source

1. Save a markdown file directly in `knowledge-base/`. Ingestion reads only `.md` files at the top level of the folder. It ignores subfolders and other formats such as PDF.
2. Start it with a `# ` heading. That heading is the source's title, which the results screen shows next to each excerpt. Without one, the file name is the title.
3. Use `##` and deeper headings to split the material by subject. Each section becomes its own chunks, so a quiz can draw on one section without the rest.
4. Restart the app, or run `npm run ingest` while Qdrant and Ollama are running.

### Ingesting

`src/instrumentation.ts` runs ingestion when the server starts, before it handles requests. The dev server does it on the first request instead. `npm run ingest` runs the same ingestion by hand and prints what it did:

```text
Ingested the knowledge base: 2 added, 0 updated, 0 unchanged, 0 removed. Stored 7 chunks.
  Added: building-a-rag-pipeline.md, embeddings-explained.md
```

For each source, ingestion:

1. Splits the text at its headings. Each section keeps its heading path, such as `Embeddings explained > Cosine similarity`.
2. Keeps a section of at most 800 characters as one chunk. A longer section is split at paragraphs, then line breaks, then sentence ends, then spaces, and each chunk after the first repeats up to 120 characters of whole sentences from the chunk before. Overlap never crosses a heading.
3. Embeds the heading path and the chunk text with `all-minilm` through Ollama.
4. Stores each chunk in Qdrant's `chunks` collection as one point: the vector, plus the chunk id, source title, position, heading path, text, a SHA-256 hash of the source and the embedding model.

A source whose content and embedding model haven't changed since the last run is skipped. An edited source has its chunks replaced, and a deleted file has its chunks removed.

Chunks are small because `all-minilm` reads at most 256 tokens in Ollama, and Ollama is told to fail rather than cut a longer text. The longest sample chunk, with its heading path, is 147 tokens.

If Qdrant or Ollama is down at startup, the app logs `Couldn't ingest the knowledge base at startup` with the reason and starts anyway. Quizzes then fail with a message saying which service to start.

### How retrieval finds chunks

When a student asks for a quiz, the app embeds the topic with the same model and asks Qdrant for the five chunks with the highest cosine similarity of at least 0.27. Cosine similarity compares the directions of two vectors: 1 means the same direction, and 0 means unrelated. Matching by meaning finds chunks that share few words with the topic. "how do I compare two vectors" finds the cosine similarity chunk. If no chunk reaches the threshold, the app refuses to write a quiz.

The code is in `src/features/retrieval/` and `src/features/ingestion/`. Retrieval sits behind `RetrievalServiceInterface`, which the generation service depends on.

### Checking similarity scores

```bash
npm run retrieval:scores -- "cosine similarity" "the French Revolution"
```

It prints the 10 chunks closest to each topic with their cosine similarity, and marks with `*` the ones retrieval would return. The threshold of 0.27 comes from running it on 22 topics. Covered topics scored 0.294 or more, and uncovered topics 0.248 or less. ADR-0003 explains the choice and its one miss. Measure again after adding sources, because more material changes the scores.

### Looking at the stored chunks

Qdrant's dashboard runs at http://localhost:6333/dashboard, or the port you set in `QDRANT_PORT`. Open the `chunks` collection to see every chunk with its payload.

### Changing the embedding model

Set `OLLAMA_EMBEDDING_MODEL`, pull the model into Ollama and restart the app. Ingestion notices that the stored chunks came from another model and embeds every source again. If the new vectors have another length, it recreates the collection first. Calibrate the threshold again with `npm run retrieval:scores` and change `similarityThreshold`, because every model scores on its own scale. Keep chunks within the new model's input limit too.

## Start the app with Docker Compose

```bash
docker compose up --build
```

Then open http://localhost:3000, or the port you set in `APP_PORT`.

This starts four services:

- `app`: the Next.js app on port 3000. It applies the database migrations and ingests the knowledge base when it starts.
- `ollama`: Ollama from the official image. Its models live on the `ollama-models` volume. It publishes no port, so it can't clash with a native Ollama.
- `ollama-pull`: pulls the chat model and the embedding model once and exits. The app starts after it has finished, so the first start waits for the downloads.
- `qdrant`: Qdrant, the vector database that holds the chunks, on the `qdrant-data` volume. It publishes port 6333 for its dashboard and the dev server. The app starts once it accepts connections.

Quizzes and attempts live in SQLite on the `quiz-data` volume, so they survive `docker compose down` and rebuilds. `docker compose down -v` deletes them, along with the downloaded models and the stored chunks. The app ingests the knowledge base again on its next start.

Ollama in Docker runs on the CPU and needs a few GB of memory for the model. On a laptop with 8 GB of RAM, close other apps first or use the fallback below.

### Fallback for low memory: Ollama outside Docker

On a machine with little memory, run Ollama natively and only the app and Qdrant in Docker:

```bash
ollama pull qwen3:1.7b
ollama pull all-minilm
docker compose up -d qdrant
docker compose build app
docker compose run --rm --no-deps --service-ports -e OLLAMA_BASE_URL=http://host.docker.internal:11434 app
```

`--no-deps` skips the Ollama containers, and `host.docker.internal` points at your machine. The app reaches the running `qdrant` service by its name. On Linux, compose maps that name to the host gateway, and the native Ollama has to listen on more than localhost. Start it with `OLLAMA_HOST=0.0.0.0 ollama serve`.

## Develop with the Next.js dev server

Day-to-day development runs the dev server on your machine against a native Ollama. Only Qdrant runs in Docker, which keeps Docker's memory use small:

```bash
npm install
cp .env.example .env
ollama pull qwen3:1.7b
ollama pull all-minilm
docker compose up -d qdrant
npm run db:migrate
npm run dev
```

Open http://localhost:3000. The dev server uses the native Ollama on http://localhost:11434 and Qdrant on http://localhost:6333, as set in `.env`. It ingests the knowledge base on the first request.

- `npm run db:migrate` creates the SQLite file in `database/data/` and applies the migrations. The data folder is gitignored, so quiz data never reaches the repo.
- `npm run db:seed` saves a sample quiz about cosine similarity, so you can take a quiz without waiting for the model.
- `npm run ingest` loads the knowledge base into Qdrant by hand, and `npm run retrieval:scores` shows similarity scores. See [Loading RAG material](#loading-rag-material).
- `docker compose stop qdrant` stops Qdrant when you're done. The chunks stay on its volume.

## Demo mode

Demo mode shows the same topic generated with and without retrieval. Turn it on by setting `DEMO_MODE="true"` in `.env` and restarting the app, with `docker compose up` or `npm run dev`. In a bash shell you can also run `DEMO_MODE=true docker compose up`.

A "Skip retrieval" checkbox then appears under the topic field. A quiz made with it ticked is an ungrounded quiz: it never calls retrieval and is written from the model's own knowledge. The quiz page labels it "Made without sources" and shows no excerpts. Outside demo mode, the app rejects a request to skip retrieval.

## Testing

### Automated tests

```bash
npm run typecheck
npm run lint
npm test
```

The tests cover the business rules in the services, the prompt builder and the markdown chunker. They run without a database, Qdrant or a model, using hand-written fakes such as `LlmClientFake`, `EmbeddingClientFake` and `RetrievalRepositoryFake`, so they are fast and run anywhere. The tests and the fakes live in `test/`, which mirrors the folders in `src/`. For example, the tests for `src/features/quiz/quiz.service.ts` are in `test/features/quiz/quiz.service.test.ts`.

### Manual check

With the app running, either with Docker Compose or the dev server:

1. Type "cosine similarity" and click "Create quiz". The button reads "Writing your quiz..." while the model works, which can take a minute or more.
2. Answer the five questions. Keys 1 to 4 pick an option, and Enter moves on.
3. Check the score, the review of every question and the excerpts on the results screen.
4. Go back to the home page. The quiz is in the list with its best score.
5. Type "the French Revolution". The error "Nothing in the knowledge base matches this topic." appears under the field.
6. Stop Ollama, with `docker compose stop ollama` or by quitting the native Ollama, and create a quiz. The error "The local model isn't reachable. Check that Ollama is running." appears.
7. Start Ollama again, run `docker compose stop qdrant` and create a quiz. The error "The knowledge base isn't reachable. Check that Qdrant is running." appears. `docker compose start qdrant` brings it back with the chunks intact.

## Where the 4T's are implemented

The prompt lives in `src/features/generation/generation.prompt.ts`. Each of the 4T's is a named constant or function there:

- **Traits**: `TRAITS`, the teacher who writes fair exam questions and uses only the material given. The ungrounded variant uses only `TRAITS_FIRST_SENTENCE`.
- **Task**: `groundedTask()`, which asks for the questions, describes each field and lists the rules. `ungroundedTask()` is the variant without chunks.
- **Tone**: `TONE`, plain, neutral and concise English.
- **Target**: `target()`, students revising the topic for an exam, tested on understanding rather than names and numbers.

`buildGroundedPrompt()` puts Traits, Tone and Target in the system message, and the Task and the numbered chunks in the user message. `buildUngroundedPrompt()` builds the demo-mode variant. `test/features/generation/generation.prompt.test.ts` tests both, and `src/features/generation/generation.service.ts` calls them.

## Project layout

- `src/app/`: Next.js pages, layouts and server actions.
- `src/components/`: React components.
- `src/features/`: one folder per feature. `quiz` and `attempt` have a model, a repository and a service behind interfaces. `generation` holds the prompt, the Ollama client and the generation service. `retrieval` holds the embedding client, the Qdrant repository and the retrieval service. `ingestion` holds the source repository, the markdown chunker and the ingestion service.
- `src/shared/`: the dependency container, the errors and `safeAction`.
- `src/instrumentation.ts`: ingests the knowledge base when the server starts.
- `knowledge-base/`: the markdown sources quizzes are built from.
- `scripts/`: `npm run db:seed`, `npm run ingest` and `npm run retrieval:scores`.
- `test/`: the unit tests and the fakes they use, in the same folders as `src/`.
- `database/`: the Prisma schema, the migrations, the gitignored SQLite data and the Prisma client.
- `GLOSSARY.md`: the project's vocabulary.
- `docs/adr/`: the architecture decisions.
