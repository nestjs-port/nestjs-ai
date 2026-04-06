import { Module } from '@nestjs/common';
import { metrics } from '@opentelemetry/api';
import { ObservationModule } from '@nestjs-ai/observation';
import { TransformersEmbeddingModelModule } from '@nestjs-ai/model-transformers';
import { AppController } from './app.controller';
import { EmbeddingService } from './embedding.service';
import { trace } from '@opentelemetry/api';

@Module({
  imports: [
    ObservationModule.forRootAsync({
      useFactory: () => ({
        tracer: trace.getTracer('nestjs-ai'),
        meter: metrics.getMeterProvider().getMeter('nestjs-ai'),
      }),
    }),
    TransformersEmbeddingModelModule.forFeature({
      model: 'Xenova/all-MiniLM-L6-v2',
    }),
  ],
  controllers: [AppController],
  providers: [EmbeddingService],
})
export class AppModule {}
