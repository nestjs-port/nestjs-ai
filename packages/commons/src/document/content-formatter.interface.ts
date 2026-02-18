import type { Document } from "./document";
import type { MetadataMode } from "./metadata-mode";

export interface ContentFormatter {
  format(document: Document, mode: MetadataMode): string;
}
