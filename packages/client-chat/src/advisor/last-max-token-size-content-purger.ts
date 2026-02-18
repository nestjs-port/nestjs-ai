import type {
  Content,
  MediaContent,
  TokenCountEstimator,
} from "@nestjs-ai/commons";

export class LastMaxTokenSizeContentPurger {
  protected readonly _tokenCountEstimator: TokenCountEstimator;
  protected readonly _maxTokenSize: number;

  constructor(tokenCountEstimator: TokenCountEstimator, maxTokenSize: number) {
    this._tokenCountEstimator = tokenCountEstimator;
    this._maxTokenSize = maxTokenSize;
  }

  purgeExcess(datum: MediaContent[], totalSize: number): Content[] {
    let index = 0;

    while (index < datum.length && totalSize > this._maxTokenSize) {
      const oldDatum = datum[index++];
      const oldMessageTokenSize = this.doEstimateTokenCount(oldDatum);
      totalSize -= oldMessageTokenSize;
    }

    if (index >= datum.length) {
      return [];
    }

    return datum.slice(index);
  }

  protected doEstimateTokenCount(datum: MediaContent): number;
  protected doEstimateTokenCount(datum: MediaContent[]): number;
  protected doEstimateTokenCount(datum: MediaContent | MediaContent[]): number {
    if (Array.isArray(datum)) {
      return datum.reduce(
        (total, mediaContent) =>
          total + this.doEstimateTokenCount(mediaContent),
        0,
      );
    }

    return this._tokenCountEstimator.estimate(datum);
  }
}
