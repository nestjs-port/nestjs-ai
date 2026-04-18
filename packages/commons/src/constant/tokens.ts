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

export const CHAT_MODEL_TOKEN = Symbol.for("CHAT_MODEL_TOKEN");
export const CHAT_MEMORY_TOKEN = Symbol.for("CHAT_MEMORY_TOKEN");
export const EMBEDDING_MODEL_TOKEN = Symbol.for("EMBEDDING_MODEL_TOKEN");
export const IMAGE_MODEL_TOKEN = Symbol.for("IMAGE_MODEL_TOKEN");
export const BATCHING_STRATEGY_TOKEN = Symbol.for("BATCHING_STRATEGY_TOKEN");
export const VECTOR_STORE_TOKEN = Symbol.for("VECTOR_STORE_TOKEN");
export const CHAT_CLIENT_BUILDER_TOKEN = Symbol.for(
  "CHAT_CLIENT_BUILDER_TOKEN",
);
export const CHAT_CLIENT_CUSTOMIZER_TOKEN = Symbol.for(
  "CHAT_CLIENT_CUSTOMIZER_TOKEN",
);
export const HTTP_CLIENT_TOKEN = Symbol.for("HTTP_CLIENT_TOKEN");
export const METER_REGISTRY_TOKEN = Symbol.for("METER_REGISTRY_TOKEN");
export const OBSERVATION_REGISTRY_TOKEN = Symbol.for(
  "OBSERVATION_REGISTRY_TOKEN",
);
export const TOOL_CALLING_OBSERVATION_PROPERTIES_TOKEN = Symbol.for(
  "TOOL_CALLING_OBSERVATION_PROPERTIES_TOKEN",
);
export const PROVIDER_INSTANCE_EXPLORER_TOKEN = Symbol.for(
  "PROVIDER_INSTANCE_EXPLORER_TOKEN",
);
