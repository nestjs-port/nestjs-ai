import { AbstractResponseMetadata } from "../model/abstract-response-metadata.js";
import type { ResponseMetadata } from "../model/response-metadata.interface.js";

/**
 * Defines the metadata associated with a moderation response, extending a base response
 * interface. This interface is intended to provide additional context or data about the
 * moderation process result.
 */
export class ModerationResponseMetadata
  extends AbstractResponseMetadata
  implements ResponseMetadata {}
