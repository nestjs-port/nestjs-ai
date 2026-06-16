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

export {
  CompactionRequest,
  type CompactionRequestProps,
} from "./compaction-request.js";
export {
  CompactionResult,
  type CompactionResultProps,
} from "./compaction-result.js";
export type { CompactionStrategy } from "./compaction-strategy.js";
export type { CompactionTrigger } from "./compaction-trigger.js";
export {
  SlidingWindowCompactionStrategy,
  type SlidingWindowCompactionStrategyProps,
} from "./sliding-window-compaction-strategy.js";
