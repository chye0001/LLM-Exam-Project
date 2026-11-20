import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { SourceFile } from "@/features/ingestion/ingestion.model";
import type { SourceRepositoryInterface } from "@/features/ingestion/ingestion.repository.interface";
import type { RetrievalConfig } from "@/features/retrieval/retrieval.config";

/**
 * Reads the knowledge base folder from disk, relative to the project root.
 *
 * The folder is read at runtime, not imported, so the `turbopackIgnore`
 * comments keep the build from tracing the whole project into the standalone
 * output. The Dockerfile copies the folder into the image itself.
 */
export class SourceRepository implements SourceRepositoryInterface {
  constructor(private readonly config: Pick<RetrievalConfig, "knowledgeBaseDir">) {}

  async listSourceFiles(): Promise<SourceFile[]> {
    const folder = path.resolve(
      /* turbopackIgnore: true */ process.cwd(),
      this.config.knowledgeBaseDir,
    );

    let entries;
    try {
      entries = await readdir(/* turbopackIgnore: true */ folder, { withFileTypes: true });
    } catch (error) {
      if (isMissingFolderError(error)) {
        throw new Error(`The knowledge base folder doesn't exist: ${folder}`);
      }
      throw error;
    }

    const names = entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
      .map((entry) => entry.name)
      .toSorted();

    return Promise.all(
      names.map(async (name) => ({
        name,
        content: await readFile(/* turbopackIgnore: true */ path.join(folder, name), "utf8"),
      })),
    );
  }
}

function isMissingFolderError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
