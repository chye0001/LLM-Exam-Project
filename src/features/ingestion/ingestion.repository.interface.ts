import type { SourceFile } from "@/features/ingestion/ingestion.model";

/** Reads the markdown files in the knowledge base folder. */
export interface SourceRepositoryInterface {
  /**
   * Returns every `.md` file at the top level of the knowledge base folder,
   * sorted by name. Subfolders and other files are ignored.
   */
  listSourceFiles(): Promise<SourceFile[]>;
}
