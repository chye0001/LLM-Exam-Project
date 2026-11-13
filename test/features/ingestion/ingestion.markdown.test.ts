import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  chunkSource,
  readSource,
  type ChunkingOptions,
} from "@/features/ingestion/ingestion.markdown";
import { DEFAULT_RETRIEVAL_CONFIG } from "@/features/retrieval/retrieval.config";

const SIX_SENTENCES =
  "Alpha is first. Beta comes next. Gamma is third. Delta is the fourth one. Epsilon ends it. Zeta is sixth.";

/** Chunks a markdown text saved as `notes.md`. */
function chunk(content: string, options: ChunkingOptions, name = "notes.md") {
  return chunkSource(readSource({ name, content }), options);
}

function texts(content: string, options: ChunkingOptions): string[] {
  return chunk(content, options).map((sourceChunk) => sourceChunk.text);
}

describe("readSource", () => {
  it("takes the title from the first level-1 heading", () => {
    const source = readSource({
      name: "notes.md",
      content: "Some text.\n\n# Embeddings explained\n\n# Another title",
    });

    expect(source.title).toBe("Embeddings explained");
  });

  it("takes the title from the file name when there is no level-1 heading", () => {
    const source = readSource({ name: "my-notes.md", content: "## Part\n\nText." });

    expect(source.title).toBe("my-notes");
  });

  it("ignores a # line inside a code block when looking for the title", () => {
    const source = readSource({
      name: "setup.md",
      content: "```bash\n# install the tools\n```\n\n# Setup",
    });

    expect(source.title).toBe("Setup");
  });

  it("gives Windows and Linux line endings the same text and hash", () => {
    const windows = readSource({ name: "notes.md", content: "# Notes\r\n\r\nText.\r\n" });
    const linux = readSource({ name: "notes.md", content: "# Notes\n\nText.\n" });

    expect(windows.text).toBe(linux.text);
    expect(windows.contentHash).toBe(linux.contentHash);
  });

  it("gives different content a different SHA-256 hash", () => {
    const first = readSource({ name: "notes.md", content: "First version." });
    const second = readSource({ name: "notes.md", content: "Second version." });

    expect(first.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(second.contentHash).not.toBe(first.contentHash);
  });
});

describe("chunkSource", () => {
  const roomy: ChunkingOptions = { maxChunkCharacters: 800, overlapCharacters: 120 };

  it("makes one chunk from a short source, without the title heading", () => {
    const [onlyChunk, ...rest] = chunk("# Notes\n\nShort text.\n", roomy);

    expect(rest).toEqual([]);
    expect(onlyChunk).toEqual({
      id: "notes-1",
      position: 1,
      headingPath: "Notes",
      text: "Short text.",
      embeddingText: "Notes\n\nShort text.",
    });
  });

  it("makes one chunk per section, with the headings above it as its path", () => {
    const content = [
      "# Notes",
      "Intro text.",
      "## Alpha",
      "Alpha text.",
      "### Alpha detail",
      "Detail text.",
      "## Beta",
      "Beta text.",
    ].join("\n\n");

    const chunks = chunk(content, roomy);

    expect(chunks.map(({ headingPath, text }) => ({ headingPath, text }))).toEqual([
      { headingPath: "Notes", text: "Intro text." },
      { headingPath: "Notes > Alpha", text: "Alpha text." },
      { headingPath: "Notes > Alpha > Alpha detail", text: "Detail text." },
      { headingPath: "Notes > Beta", text: "Beta text." },
    ]);
  });

  it("starts the path with the file name when the source has no title heading", () => {
    const chunks = chunk("## Part\n\nText.", roomy, "my-notes.md");

    expect(chunks[0].headingPath).toBe("my-notes > Part");
  });

  it("drops headings with no text under them and numbers the rest from 1", () => {
    const content = "# Notes\n\n## Empty\n\n## Full\n\nText.\n\n## Also empty\n\n## Last\n\nMore.";

    const chunks = chunk(content, roomy);

    expect(chunks.map(({ id, position, headingPath }) => ({ id, position, headingPath }))).toEqual([
      { id: "notes-1", position: 1, headingPath: "Notes > Full" },
      { id: "notes-2", position: 2, headingPath: "Notes > Last" },
    ]);
  });

  it("keeps a # line inside a code block as text", () => {
    const content = "# Setup\n\nRun this:\n\n```bash\n# install the tools\nnpm ci\n```";

    const chunks = chunk(content, roomy);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe("Run this:\n\n```bash\n# install the tools\nnpm ci\n```");
  });

  it("splits a long section at paragraphs before sentences", () => {
    const content = [
      "Alpha is first. Beta comes next.",
      "Gamma is third. Delta is the fourth one.",
      "Epsilon ends it. Zeta is sixth.",
    ].join("\n\n");

    expect(texts(content, { maxChunkCharacters: 100, overlapCharacters: 0 })).toEqual([
      "Alpha is first. Beta comes next.\n\nGamma is third. Delta is the fourth one.",
      "Epsilon ends it. Zeta is sixth.",
    ]);
  });

  it("splits a long paragraph at sentence ends and repeats the last sentences that fit", () => {
    expect(texts(SIX_SENTENCES, { maxChunkCharacters: 100, overlapCharacters: 40 })).toEqual([
      "Alpha is first. Beta comes next. Gamma is third.",
      "Beta comes next. Gamma is third. Delta is the fourth one. Epsilon ends it. Zeta is sixth.",
    ]);
  });

  it("leaves out the overlap when the last sentence is longer than it", () => {
    const content = "A long opening sentence here. Another sentence that is quite long. End.";

    expect(texts(content, { maxChunkCharacters: 50, overlapCharacters: 10 })).toEqual([
      "A long opening sentence here.",
      "Another sentence that is quite long.",
      "End.",
    ]);
  });

  it("splits a sentence that is too long at spaces", () => {
    const content = "one two three four five six seven eight nine ten eleven";

    expect(texts(content, { maxChunkCharacters: 30, overlapCharacters: 0 })).toEqual([
      "one two three four five six",
      "seven eight nine ten eleven",
    ]);
  });

  it("cuts a word that is longer than a chunk", () => {
    expect(
      texts("abcdefghijklmnopqrstuvwxyz", { maxChunkCharacters: 10, overlapCharacters: 0 }),
    ).toEqual(["abcdefghij", "klmnopqrst", "uvwxyz"]);
  });

  it("never carries overlap across a heading", () => {
    const content = `# Notes\n\n## Long\n\n${SIX_SENTENCES}\n\n## Short\n\nShort text.`;

    const chunks = chunk(content, { maxChunkCharacters: 100, overlapCharacters: 40 });

    expect(chunks.at(-1)).toMatchObject({ headingPath: "Notes > Short", text: "Short text." });
  });

  it("keeps every chunk of the knowledge base within the default limit", () => {
    const folder = path.resolve("knowledge-base");
    const names = readdirSync(folder).filter((name) => name.endsWith(".md"));
    expect(names.length).toBeGreaterThan(0);

    for (const name of names) {
      const content = readFileSync(path.join(folder, name), "utf8");
      const chunks = chunkSource(readSource({ name, content }), DEFAULT_RETRIEVAL_CONFIG);

      expect(chunks.length).toBeGreaterThan(0);
      for (const sourceChunk of chunks) {
        expect(sourceChunk.text.length).toBeLessThanOrEqual(
          DEFAULT_RETRIEVAL_CONFIG.maxChunkCharacters,
        );
      }
    }
  });

  it("gives the same chunks and ids every time it runs on the same source", () => {
    expect(chunk(SIX_SENTENCES, { maxChunkCharacters: 100, overlapCharacters: 40 })).toEqual(
      chunk(SIX_SENTENCES, { maxChunkCharacters: 100, overlapCharacters: 40 }),
    );
  });

  it("rejects an overlap as long as a chunk", () => {
    expect(() =>
      chunk(SIX_SENTENCES, { maxChunkCharacters: 100, overlapCharacters: 100 }),
    ).toThrow("overlap");
  });
});
