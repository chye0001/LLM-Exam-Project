import { describe, expect, it } from "vitest";

import {
  DEFAULT_RETRIEVAL_CONFIG,
  loadRetrievalConfig,
} from "@/features/retrieval/retrieval.config";

describe("loadRetrievalConfig", () => {
  it("uses the defaults when no variable is set", () => {
    expect(loadRetrievalConfig({})).toEqual(DEFAULT_RETRIEVAL_CONFIG);
  });

  it("uses all-minilm, local Ollama and local Qdrant by default", () => {
    const config = loadRetrievalConfig({});

    expect(config.embeddingModel).toBe("all-minilm");
    expect(config.ollamaBaseUrl).toBe("http://localhost:11434");
    expect(config.qdrantUrl).toBe("http://localhost:6333");
    expect(config.knowledgeBaseDir).toBe("knowledge-base");
  });

  it("takes the model, the URLs and the folder from the environment", () => {
    const config = loadRetrievalConfig({
      OLLAMA_EMBEDDING_MODEL: "nomic-embed-text",
      OLLAMA_BASE_URL: "http://ollama:11434",
      QDRANT_URL: "http://qdrant:6333",
      KNOWLEDGE_BASE_DIR: "other-sources",
    });

    expect(config).toEqual({
      ...DEFAULT_RETRIEVAL_CONFIG,
      embeddingModel: "nomic-embed-text",
      ollamaBaseUrl: "http://ollama:11434",
      qdrantUrl: "http://qdrant:6333",
      knowledgeBaseDir: "other-sources",
    });
  });

  it("ignores variables that are set but empty", () => {
    const config = loadRetrievalConfig({
      OLLAMA_EMBEDDING_MODEL: "",
      QDRANT_URL: "",
    });

    expect(config).toEqual(DEFAULT_RETRIEVAL_CONFIG);
  });
});
