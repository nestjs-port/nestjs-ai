/*
 * Copyright 2023-present the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import "reflect-metadata";

import { Test } from "@nestjs/testing";

import { McpServerModule } from "../../../../dist/index.js";
import { PromptFixtureModule, SERVER_INFO } from "./prompt-fixture.js";

async function bootstrap(): Promise<void> {
  const moduleRef = await Test.createTestingModule({
    imports: [
      McpServerModule.forRootAsync({
        imports: [PromptFixtureModule],
        transport: "stdio",
        useFactory: () => ({
          serverInfo: SERVER_INFO,
        }),
      }),
    ],
  }).compile();

  await moduleRef.init();

  const keepAlive = setInterval(() => undefined, 60_000);
  const shutdown = async (): Promise<void> => {
    clearInterval(keepAlive);
    await moduleRef.close();
  };

  process.once("SIGTERM", () => {
    void shutdown().finally(() => process.exit(0));
  });

  process.once("SIGINT", () => {
    void shutdown().finally(() => process.exit(0));
  });

  await new Promise<void>(() => {});
}

void bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
