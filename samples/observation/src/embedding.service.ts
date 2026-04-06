import { Injectable } from "@nestjs/common";
import type { EmbeddingModel } from "@nestjs-ai/model";
import { InjectEmbeddingModel } from "@nestjs-ai/platform";

@Injectable()
export class EmbeddingService {
  constructor(
    @InjectEmbeddingModel()
    private readonly embeddingModel: EmbeddingModel,
  ) {}

  async embed(text: string): Promise<{ dimensions: number }> {
    const embedding = await this.embeddingModel.embed(text);
    return {
      dimensions: embedding.length,
    };
  }
}
