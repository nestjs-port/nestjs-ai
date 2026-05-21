import type { ModelOptions } from "../model/model-options.interface.js";

/**
 * Represents the options for moderation.
 */
export interface ModerationOptions extends ModelOptions {
  get model(): string | null;
}
