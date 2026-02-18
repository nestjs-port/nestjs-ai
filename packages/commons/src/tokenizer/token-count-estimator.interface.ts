import type { MediaContent } from "../content";

export interface TokenCountEstimator {
  estimate(text: string | null): number;

  estimate(content: MediaContent): number;

  estimate(messages: Iterable<MediaContent>): number;
}
