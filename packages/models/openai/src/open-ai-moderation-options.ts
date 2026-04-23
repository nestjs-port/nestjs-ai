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

import type { ModerationOptions } from "@nestjs-ai/model";

import {
  AbstractOpenAiOptions,
  type AbstractOpenAiOptionsProps,
} from "./abstract-open-ai-options.js";

export interface OpenAiModerationOptionsProps extends AbstractOpenAiOptionsProps {}

/**
 * OpenAI SDK Moderation Options.
 */
export class OpenAiModerationOptions
  extends AbstractOpenAiOptions
  implements ModerationOptions
{
  /**
   * Default moderation model.
   */
  static readonly DEFAULT_MODERATION_MODEL = "omni-moderation-latest";

  constructor(props: OpenAiModerationOptionsProps = {}) {
    super(props);
  }

  get model(): string {
    return super.model ?? OpenAiModerationOptions.DEFAULT_MODERATION_MODEL;
  }
}
