import { Controller, Get, Query } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';

@Controller()
export class AppController {
  constructor(private readonly embeddingService: EmbeddingService) {}

  @Get('embedding')
  async getEmbedding(@Query('text') text = 'NestJS AI observation sample'): Promise<{ dimensions: number }> {
    const result = await this.embeddingService.embed(text);

    return { dimensions: result.dimensions };
  }
}
