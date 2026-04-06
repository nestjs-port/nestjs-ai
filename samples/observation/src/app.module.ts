import { Module } from "@nestjs/common";
import { TransformersEmbeddingModelModule } from "@nestjs-ai/model-transformers";
import { ObservationModule } from "@nestjs-ai/observation";
import { metrics, trace } from "@opentelemetry/api";
import { AppController } from "./app.controller";
import { EmbeddingService } from "./embedding.service";

@Module({
  imports: [
    ObservationModule.forRootAsync({
      useFactory: () => ({
        tracer: trace.getTracer("nestjs-ai"),
        meter: metrics.getMeterProvider().getMeter("nestjs-ai"),
      }),
    }),
    TransformersEmbeddingModelModule.forFeature({
      model: "Xenova/all-MiniLM-L6-v2",
    }),
  ],
  controllers: [AppController],
  providers: [EmbeddingService],
})
export class AppModule {}
