import type { MediaContent } from "../content/media-content.interface.js";

export interface TokenCountEstimator {
  estimate(text: string | null): number;

  estimate(content: MediaContent): number;

  estimate(messages: Iterable<MediaContent>): number;
}
