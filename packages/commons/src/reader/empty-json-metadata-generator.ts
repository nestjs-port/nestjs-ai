import type { JsonMetadataGenerator } from "./json-metadata-generator";

export class EmptyJsonMetadataGenerator implements JsonMetadataGenerator {
  private static readonly EMPTY_MAP: Record<string, unknown> = Object.freeze(
    {},
  );

  generate(_jsonMap: Record<string, unknown>): Record<string, unknown> {
    return EmptyJsonMetadataGenerator.EMPTY_MAP;
  }
}
