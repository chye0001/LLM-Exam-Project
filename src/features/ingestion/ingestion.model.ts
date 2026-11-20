/** A markdown file in the knowledge base folder, as it was read from disk. */
export type SourceFile = {
  /** The file name, such as `embeddings-explained.md`. Unique within the knowledge base. */
  name: string;
  content: string;
};

/** One document in the knowledge base, ready to be split into chunks. */
export type Source = {
  /** The file name, such as `embeddings-explained.md`. Unique within the knowledge base. */
  name: string;
  /** The text of the first `# ` heading, or the file name without `.md`. */
  title: string;
  /** The file's content with `\n` line endings. */
  text: string;
  /** SHA-256 of `text`, so ingestion can tell when a source changed. */
  contentHash: string;
};

/** What one ingestion run did, by source file name. */
export type IngestionReport = {
  /** Sources that had no stored chunks before. */
  added: string[];
  /** Sources whose content or embedding model changed, so their chunks were replaced. */
  updated: string[];
  /** Sources whose stored chunks were already current. */
  unchanged: string[];
  /** Stored sources whose file is gone. */
  removed: string[];
  /** Sources with no text, which have no chunks. */
  empty: string[];
  /** How many chunks this run embedded and stored. */
  chunksStored: number;
};

/** A piece of a source, ready to be embedded and stored. */
export type SourceChunk = {
  /** The source's file name without `.md`, a dash and the position, such as `embeddings-explained-3`. */
  id: string;
  /** The chunk's place in its source, counted from 1. */
  position: number;
  /** The source's title and the headings above the chunk, such as `Embeddings explained > Cosine similarity`. */
  headingPath: string;
  /** The text the prompt and the excerpts show. */
  text: string;
  /** The text the embedding model reads: the heading path, a blank line and the text. */
  embeddingText: string;
};
