# LLM-Exam-Project

A local quiz app for students revising for an exam. The student types a topic, the app retrieves the matching chunks from the knowledge base, and a local model in Ollama writes a five-question multiple-choice quiz from those chunks. If nothing in the knowledge base matches the topic, the app says so instead of letting the model write from its training data.

Everything runs on your machine. Next.js serves the app, Ollama runs the model, and SQLite stores quizzes and attempts.

## Prerequisites

- [Git](https://git-scm.com/).
- [Docker](https://docs.docker.com/get-docker/) with Compose v2 (`docker compose`), to run the whole project in containers.
- [Node.js](https://nodejs.org/) 24 with npm, to develop and to run the tests. The Docker image uses Node 24 too.
- [Ollama](https://ollama.com/download) installed natively, for development and for the low-memory fallback. Docker Compose doesn't need it.
- About 4 GB of free memory for Docker with the default model, plus about 8 GB of disk: the Ollama image is about 5 GB, the app image about 1 GB and the model 1.4 GB. The app runs the model on the CPU, so it needs no GPU.

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

`npm install` also generates the Prisma client into `src/shared/db/generated/`.

## Configuration

The app reads these environment variables. `.env.example` lists them with their defaults, and `cp .env.example .env` gives you a working setup. Every variable is optional.

| Variable | Default | What it does |
| --- | --- | --- |
| `OLLAMA_MODEL` | `qwen3:1.7b` | The Ollama model that writes quizzes. |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Where Ollama runs. Docker Compose sets it to its own Ollama service and ignores `.env` for it. |
| `DEMO_MODE` | `false` | `true` shows the "Skip retrieval" checkbox. See [Demo mode](#demo-mode). |
| `DATABASE_URL` | `file:./src/shared/db/data/quiz.db` | Where the SQLite file lives, relative to the project root. Docker Compose sets it and ignores `.env` for it. |
| `APP_PORT` | `3000` | Docker Compose only. The port on your machine, when 3000 is taken. |

Docker Compose reads `OLLAMA_MODEL`, `DEMO_MODE` and `APP_PORT` from your shell or from the `.env` file next to `compose.yaml`. The dev server and `npm run db:seed` read `.env` too.

The other generation settings live in `DEFAULT_GENERATION_CONFIG` in `src/features/generation/generation.config.ts`: five questions per quiz, at most five chunks per retrieval, a 4,096-token context window, temperature 0.7, top-p 0.8 and top-k 20, a 3-minute timeout per model call and three tries.

## Model setup

The default model is `qwen3:1.7b`, a 1.4 GB download. It was picked because the development laptop has 7.8 GB of RAM and runs Ollama on the CPU. Expect a minute or more per quiz on a laptop. The app turns thinking off for every call.

With Docker Compose, the `ollama-pull` service downloads the model the first time you start the project, so you have nothing to do.

For development and the fallback, pull it into your native Ollama:

```bash
ollama pull qwen3:1.7b
```

To try a bigger model on a machine with more memory, pull it and set `OLLAMA_MODEL`, for example `OLLAMA_MODEL=qwen3:4b`.

## Loading RAG material

> **The group's retriever isn't built yet.** Until it is, the app uses a stub that serves two built-in sample sources, so there is nothing to load. The whole app works against the stub.

### The stub's sample sources

`RetrievalServiceStub` in `src/features/retrieval/retrieval.service.stub.ts` serves five chunks from two sample sources. Their text is in `src/features/retrieval/retrieval.sample-chunks.ts`:

- "Embeddings explained", three chunks: what an embedding is, how embedding models are trained, and how cosine similarity, the dot product and Euclidean distance compare embeddings.
- "Building a RAG pipeline", two chunks: chunk size and overlap, and how retrieval-augmented generation retrieves chunks and puts them in the prompt.

The stub matches by shared words instead of embeddings. A chunk's similarity is the share of the topic's meaningful words that the chunk or its source title contains. Topics such as "cosine similarity", "embeddings" or "chunk size" find chunks. An unrelated topic such as "the French Revolution" finds nothing, and the app refuses to write a quiz.

### Ingesting the group's knowledge base

<!-- TODO(group): replace this section with the real ingestion steps. -->

> **TODO, the group:** describe here how to load the knowledge base once ingestion exists:
>
> 1. Where the sources go.
> 2. The command that splits them into chunks, embeds them and stores them in the vector store.
> 3. Which embedding model to pull, for example `ollama pull embeddinggemma`, and how Docker Compose pulls it.
> 4. Any new environment variables, which also belong in `.env.example`, `compose.yaml` and the table above.

The retriever plugs in behind one interface, `RetrievalServiceInterface` in `src/features/retrieval/retrieval.service.interface.ts`. Its comments describe the contract. To switch from the stub to the real retriever, change the line in `src/shared/dependency-container.ts` that creates `RetrievalServiceStub`. ADR-0001 in `docs/adr/` explains this boundary.

## Start the app with Docker Compose

```bash
docker compose up --build
```

Then open http://localhost:3000, or the port you set in `APP_PORT`.

This starts three services:

- `app`: the Next.js app on port 3000. It applies the database migrations when it starts.
- `ollama`: Ollama from the official image. Its models live on the `ollama-models` volume. It publishes no port, so it can't clash with a native Ollama.
- `ollama-pull`: pulls the model once and exits. The app starts after it has finished, so the first start waits for the download.

Quizzes and attempts live in SQLite on the `quiz-data` volume, so they survive `docker compose down` and rebuilds. `docker compose down -v` deletes them, and the downloaded model with them.

Ollama in Docker runs on the CPU and needs a few GB of memory for the model. On a laptop with 8 GB of RAM, close other apps first or use the fallback below.

### Fallback for low memory: only the app in Docker

On a machine with little memory, run Ollama natively and only the app in Docker:

```bash
ollama pull qwen3:1.7b
docker compose build app
docker compose run --rm --no-deps --service-ports -e OLLAMA_BASE_URL=http://host.docker.internal:11434 app
```

`--no-deps` skips the Ollama containers, and `host.docker.internal` points at your machine. On Linux, compose maps that name to the host gateway, and the native Ollama has to listen on more than localhost. Start it with `OLLAMA_HOST=0.0.0.0 ollama serve`.

## Develop with the Next.js dev server

Day-to-day development runs the dev server on your machine against a native Ollama, which avoids Docker's memory overhead:

```bash
npm install
cp .env.example .env
ollama pull qwen3:1.7b
npm run db:migrate
npm run dev
```

Open http://localhost:3000. The dev server uses the native Ollama on http://localhost:11434, as set in `.env`.

- `npm run db:migrate` creates the SQLite file in `src/shared/db/data/` and applies the migrations. The data folder is gitignored, so quiz data never reaches the repo.
- `npm run db:seed` saves a sample quiz about cosine similarity, so you can take a quiz without waiting for the model.

## Demo mode

Demo mode shows the same topic generated with and without retrieval. Turn it on by setting `DEMO_MODE="true"` in `.env` and restarting the app, with `docker compose up` or `npm run dev`. In a bash shell you can also run `DEMO_MODE=true docker compose up`.

A "Skip retrieval" checkbox then appears under the topic field. A quiz made with it ticked is an ungrounded quiz: it never calls retrieval and is written from the model's own knowledge. The quiz page labels it "Made without sources" and shows no excerpts. Outside demo mode, the app rejects a request to skip retrieval.

A demo at the exam could go like this:

1. Generate "cosine similarity" normally. The results screen shows the excerpts it came from, with their source titles and similarity.
2. Generate "cosine similarity" again with "Skip retrieval" ticked, and compare the two quizzes.
3. Generate "the French Revolution". The app refuses, because nothing in the knowledge base matches.

## Testing

### Automated tests

```bash
npm run typecheck
npm run lint
npm test
```

The tests cover the business rules in the services and the prompt builder. They run without a database or a model, using hand-written fakes such as `LlmClientFake` and `RetrievalServiceFake`, so they are fast and run anywhere. The test files sit next to the code they test, as `*.test.ts` in `src/features/`.

### Manual check

With the app running, either with Docker Compose or the dev server:

1. Type "cosine similarity" and click "Create quiz". The button reads "Writing your quiz..." while the model works, which can take a minute or more.
2. Answer the five questions. Keys 1 to 4 pick an option, and Enter moves on.
3. Check the score, the review of every question and the excerpts on the results screen.
4. Go back to the home page. The quiz is in the list with its best score.
5. Type "the French Revolution". The error "Nothing in the knowledge base matches this topic." appears under the field.
6. Stop Ollama, with `docker compose stop ollama` or by quitting the native Ollama, and create a quiz. The error "The local model isn't reachable. Check that Ollama is running." appears.

## Where the 4T's are implemented

The prompt lives in `src/features/generation/generation.prompt.ts`. Each of the 4T's is a named constant or function there:

- **Traits**: `TRAITS`, the teacher who writes fair exam questions and uses only the material given. The ungrounded variant uses only `TRAITS_FIRST_SENTENCE`.
- **Task**: `groundedTask()`, which asks for the questions, describes each field and lists the rules. `ungroundedTask()` is the variant without chunks.
- **Tone**: `TONE`, plain, neutral and concise English.
- **Target**: `target()`, students revising the topic for an exam, tested on understanding rather than names and numbers.

`buildGroundedPrompt()` puts Traits, Tone and Target in the system message, and the Task and the numbered chunks in the user message. `buildUngroundedPrompt()` builds the demo-mode variant. `src/features/generation/generation.prompt.test.ts` tests both, and `src/features/generation/generation.service.ts` calls them.

## Project layout

- `src/app/`: Next.js pages, layouts and server actions.
- `src/components/`: React components.
- `src/features/`: one folder per feature. `quiz` and `attempt` have a model, a repository and a service behind interfaces. `generation` holds the prompt, the Ollama client and the generation service. `retrieval` holds the retrieval interface, the stub and a fake.
- `src/shared/`: the dependency container, the errors, `safeAction` and the Prisma client, schema and migrations.
- `GLOSSARY.md`: the project's vocabulary.
- `docs/adr/`: the architecture decisions.
