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

import type { OnApplicationBootstrap } from "@nestjs/common";
import type {
  ObservationHandlers,
  ObservationRegistry,
} from "@nestjs-ai/commons";

export class ObservationProviderPostProcessor
  implements OnApplicationBootstrap
{
  constructor(
    private readonly registry: ObservationRegistry,
    private readonly observationHandlers: ObservationHandlers,
  ) {}

  onApplicationBootstrap(): void {
    for (const handler of this.observationHandlers.handlers) {
      this.registry.addHandler(handler);
    }
  }
}
