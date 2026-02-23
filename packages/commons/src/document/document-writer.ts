import type { Document } from "./document";

export abstract class DocumentWriter {
  abstract accept(documents: Document[]): Promise<void>;

  async write(documents: Document[]): Promise<void> {
    await this.accept(documents);
  }
}
