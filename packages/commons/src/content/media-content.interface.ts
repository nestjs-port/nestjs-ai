import type { Content } from "./content.interface";
import type { Media } from "./media";

export interface MediaContent extends Content {
  /**
   * Get the media associated with the content.
   */
  get media(): Media[];
}
