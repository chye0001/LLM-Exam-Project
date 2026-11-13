import { createHash } from "node:crypto";

import type {
  Source,
  SourceChunk,
  SourceFile,
} from "@/features/ingestion/ingestion.model";
import type { RetrievalConfig } from "@/features/retrieval/retrieval.config";

export type ChunkingOptions = Pick<
  RetrievalConfig,
  "maxChunkCharacters" | "overlapCharacters"
>;

/** A markdown heading, such as `## Cosine similarity`, with optional closing hashes. */
const HEADING = /^(#{1,6})[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/;

/** The start or end of a fenced code block, where `#` lines aren't headings. */
const CODE_FENCE = /^[ \t]{0,3}(```|~~~)/;

const SENTENCES = new Intl.Segmenter("en", { granularity: "sentence" });

type Heading = { level: number; text: string };

type MarkdownLine = { text: string; heading: Heading | null };

/** A run of text under one heading. */
type Section = { headingPath: string; text: string };

/** A piece of a section, with the separator that joins it to the piece before it. */
type Piece = { text: string; separator: string };

/**
 * The ways a section is split when it is too long, tried in order: at blank
 * lines (paragraphs), at line breaks, at sentence ends and at spaces.
 */
const SPLIT_LEVELS: { separator: string; split: (text: string) => string[] }[] = [
  { separator: "\n\n", split: (text) => text.split(/\n[ \t]*\n/) },
  { separator: "\n", split: (text) => text.split("\n") },
  { separator: " ", split: splitIntoSentences },
  { separator: " ", split: (text) => text.split(/\s+/) },
];

/**
 * Turns a file from the knowledge base folder into a source. Line endings
 * become `\n` first, so a file checked out on Windows gets the same hash as
 * the same file on Linux.
 */
export function readSource(file: SourceFile): Source {
  const text = file.content.replace(/\r\n?/g, "\n");
  const titleHeading = readLines(text).find((line) => line.heading?.level === 1);
  return {
    name: file.name,
    title: titleHeading?.heading?.text ?? baseNameOf(file.name),
    text,
    contentHash: createHash("sha256").update(text).digest("hex"),
  };
}

/**
 * Splits a source into chunks along its headings.
 *
 * Each section under a heading becomes one chunk when it fits in
 * `maxChunkCharacters`. A longer section is split at paragraphs, then line
 * breaks, then sentence ends, then spaces, and the pieces are packed into
 * chunks. Every chunk of a split section after the first starts with the last
 * whole sentences of the chunk before it, up to `overlapCharacters`. Overlap
 * never crosses a heading, and no chunk is longer than `maxChunkCharacters`.
 */
export function chunkSource(source: Source, options: ChunkingOptions): SourceChunk[] {
  const { maxChunkCharacters, overlapCharacters } = options;
  if (overlapCharacters < 0 || overlapCharacters >= maxChunkCharacters) {
    throw new Error(
      `The overlap (${overlapCharacters}) must be at least 0 and shorter than a chunk (${maxChunkCharacters}).`,
    );
  }

  const baseName = baseNameOf(source.name);
  let position = 0;
  return splitIntoSections(source).flatMap((section) =>
    chunkSection(section.text, options).map((text) => {
      position += 1;
      return {
        id: `${baseName}-${position}`,
        position,
        headingPath: section.headingPath,
        text,
        embeddingText: `${section.headingPath}\n\n${text}`,
      };
    }),
  );
}

function baseNameOf(fileName: string): string {
  return fileName.replace(/\.md$/i, "");
}

/** The source's lines, with the headings found outside code blocks. */
function readLines(text: string): MarkdownLine[] {
  let insideCodeBlock = false;
  return text.split("\n").map((line) => {
    if (CODE_FENCE.test(line)) {
      insideCodeBlock = !insideCodeBlock;
      return { text: line, heading: null };
    }
    const match = insideCodeBlock ? null : line.match(HEADING);
    return {
      text: line,
      heading: match ? { level: match[1].length, text: match[2].trim() } : null,
    };
  });
}

/**
 * Splits the source at every heading. A section's heading path is the
 * source's title followed by the headings above it. The first level-1
 * heading is the title itself, so it isn't repeated. Sections with no text
 * are dropped.
 */
function splitIntoSections(source: Source): Section[] {
  const sections: Section[] = [];
  let headings: Heading[] = [];
  let lines: string[] = [];
  let titleSeen = false;

  const finishSection = () => {
    const text = lines.join("\n").trim();
    if (text) {
      const headingPath = [source.title, ...headings.map((heading) => heading.text)];
      sections.push({ headingPath: headingPath.join(" > "), text });
    }
    lines = [];
  };

  for (const line of readLines(source.text)) {
    if (!line.heading) {
      lines.push(line.text);
      continue;
    }

    finishSection();
    const heading = line.heading;
    if (heading.level === 1 && !titleSeen) {
      titleSeen = true;
      headings = [];
      continue;
    }
    headings = [...headings.filter((above) => above.level < heading.level), heading];
  }
  finishSection();

  return sections;
}

/** Splits a section's text into chunks, with overlap between the chunks of a split section. */
function chunkSection(text: string, options: ChunkingOptions): string[] {
  const { maxChunkCharacters, overlapCharacters } = options;
  if (text.length <= maxChunkCharacters) {
    return [text];
  }

  // Leaves room for the overlap in front of every chunk after the first.
  const budget = maxChunkCharacters - overlapCharacters;
  const chunks = pack(splitIntoPieces(text, budget, 0, ""), budget);
  return chunks.map((chunk, index) =>
    index === 0 ? chunk : withOverlap(chunks[index - 1], chunk, overlapCharacters),
  );
}

/**
 * Splits text into pieces of at most `budget` characters, trying each split
 * level in turn on the parts that are still too long. A word longer than the
 * budget is cut into pieces of exactly the budget.
 */
function splitIntoPieces(
  text: string,
  budget: number,
  level: number,
  separator: string,
): Piece[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }
  if (trimmed.length <= budget) {
    return [{ text: trimmed, separator }];
  }

  const splitLevel = SPLIT_LEVELS[level];
  if (!splitLevel) {
    return cutWord(trimmed, budget, separator);
  }

  return splitLevel
    .split(trimmed)
    .flatMap((part, index) =>
      splitIntoPieces(part, budget, level + 1, index === 0 ? separator : splitLevel.separator),
    );
}

function cutWord(word: string, budget: number, separator: string): Piece[] {
  const pieces: Piece[] = [];
  for (let start = 0; start < word.length; start += budget) {
    pieces.push({
      text: word.slice(start, start + budget),
      separator: start === 0 ? separator : "",
    });
  }
  return pieces;
}

/** Joins pieces in order into chunks of at most `budget` characters. */
function pack(pieces: Piece[], budget: number): string[] {
  const chunks: string[] = [];
  let current = "";
  for (const piece of pieces) {
    const joined = current ? current + piece.separator + piece.text : piece.text;
    if (joined.length <= budget) {
      current = joined;
    } else {
      chunks.push(current);
      current = piece.text;
    }
  }
  if (current) {
    chunks.push(current);
  }
  return chunks;
}

/**
 * Puts the last whole sentences of the chunk before in front of the chunk,
 * as many as fit in `overlapCharacters` together with the joining space.
 */
function withOverlap(previous: string, chunk: string, overlapCharacters: number): string {
  const sentences = splitIntoSentences(previous);
  let overlap = "";
  for (let index = sentences.length - 1; index >= 0; index--) {
    const longer = overlap ? `${sentences[index]} ${overlap}` : sentences[index];
    if (longer.length + 1 > overlapCharacters) {
      break;
    }
    overlap = longer;
  }
  return overlap ? `${overlap} ${chunk}` : chunk;
}

function splitIntoSentences(text: string): string[] {
  return [...SENTENCES.segment(text)]
    .map((sentence) => sentence.segment.trim())
    .filter(Boolean);
}
