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

import { Usage } from "./usage.js";

/**
 * An EmptyUsage implementation that returns zero for all property getters.
 */
export class EmptyUsage extends Usage {
  get promptTokens(): number {
    return 0;
  }

  get completionTokens(): number {
    return 0;
  }

  get nativeUsage(): unknown {
    return {};
  }
}
