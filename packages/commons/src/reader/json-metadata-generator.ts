export interface JsonMetadataGenerator {
  generate(jsonMap: Record<string, unknown>): Record<string, unknown>;
}
