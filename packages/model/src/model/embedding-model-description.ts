import type { ModelDescription } from "./model-description.interface";

export abstract class EmbeddingModelDescription implements ModelDescription {
  abstract get name(): string;

  abstract get description(): string;

  abstract get version(): string;

  get dimensions(): number {
    return -1;
  }
}
