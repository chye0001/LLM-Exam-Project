# LLM-Exam-Project
Interactive quiz generated using RAG + L-LLM where data is pulled from a vector database, enabling semantic search.

## Run it with Docker Compose

```bash
docker compose up --build
```

This starts three services:

- `app`: the Next.js app on http://localhost:3000. It applies the database migrations when it starts.
- `ollama`: Ollama from the official image. Its models live on the `ollama-models` volume, and it publishes no port, so it can't clash with a native Ollama.
- `ollama-pull`: pulls the model once and exits. The app starts after it has finished, so the first start waits for the download.

Quizzes live in SQLite on the `quiz-data` volume, so they survive `docker compose down` and rebuilds. `docker compose down -v` deletes them, and the downloaded model with them.

Settings, read from your shell or a `.env` file next to `compose.yaml`:

- `OLLAMA_MODEL`: the model that writes quizzes. Defaults to `qwen3:1.7b`.
- `DEMO_MODE=true`: shows the "Skip retrieval" checkbox.
- `APP_PORT`: the port on your machine, when 3000 is taken. Defaults to `3000`.

Ollama in Docker runs on the CPU and needs a few GB of memory for the model. On a laptop with 8 GB of RAM, close other apps first or use the fallback below.

### Fallback: only the app in Docker

On a machine with little memory, run Ollama natively and only the app in Docker:

```bash
ollama pull qwen3:1.7b
docker compose build app
docker compose run --rm --no-deps --service-ports -e OLLAMA_BASE_URL=http://host.docker.internal:11434 app
```

`--no-deps` skips the Ollama containers, and `host.docker.internal` points at your machine. On Linux, compose maps that name to the host gateway, and the native Ollama has to listen on more than localhost: start it with `OLLAMA_HOST=0.0.0.0 ollama serve`.

## Develop locally

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run dev
```

The dev server uses a native Ollama on http://localhost:11434. Run `ollama pull qwen3:1.7b` first.

- `npm run typecheck`, `npm run lint` and `npm test` check the code.
- `npm run db:seed` saves a sample quiz.
