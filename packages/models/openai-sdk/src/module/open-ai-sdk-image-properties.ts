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

import type { OpenAiSdkImageOptions } from "../open-ai-sdk-image-options";

import type { OpenAiSdkConnectionProperties } from "./open-ai-sdk-connection-properties";

export const OPEN_AI_SDK_IMAGE_PROPERTIES_PREFIX = "spring.ai.openai-sdk.image";
export const OPEN_AI_SDK_IMAGE_DEFAULT_MODEL = "dall-e-3";

export interface OpenAiSdkImageProperties
  extends OpenAiSdkConnectionProperties {
  options?: Partial<OpenAiSdkImageOptions>;
}
