import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  createProductionOtelRuntime,
  shutdownProductionOtelRuntime,
} from './otel-runtime';

async function bootstrap() {
  const runtime = createProductionOtelRuntime();
  await runtime.start();

  const app = await NestFactory.create(AppModule, {
    logger: false,
  });
  const port = Number(process.env.PORT ?? 3000);

  const shutdown = async () => {
    await app.close();
    await shutdownProductionOtelRuntime(runtime);
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  await app.listen(port);
}
bootstrap();
