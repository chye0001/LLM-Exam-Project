import type { SourceFile } from "@/features/ingestion/ingestion.model";
import type { SourceRepositoryInterface } from "@/features/ingestion/ingestion.repository.interface";

/** A knowledge base folder in memory. Tests add, edit and delete files in it. */
export class SourceRepositoryFake implements SourceRepositoryInterface {
  private readonly files = new Map<string, string>();

  /** Adds the file, or replaces its content when it exists. */
  writeFile(name: string, content: string): void {
    this.files.set(name, content);
  }

  deleteFile(name: string): void {
    this.files.delete(name);
  }

  async listSourceFiles(): Promise<SourceFile[]> {
    return [...this.files]
      .map(([name, content]) => ({ name, content }))
      .toSorted((first, second) => first.name.localeCompare(second.name));
  }
}
