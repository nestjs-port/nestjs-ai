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

import type { Model } from "../model/index.js";
import type { ModerationPrompt } from "./moderation-prompt.js";
import type { ModerationResponse } from "./moderation-response.js";

/**
 * The ModerationModel interface defines a generic AI model for moderation. It extends the
 * Model interface to handle the interaction with various types of AI models. It provides
 * a single method, call, which takes a ModerationPrompt as input and returns a
 * ModerationResponse.
 */
export interface ModerationModel extends Model<
  ModerationPrompt,
  ModerationResponse
> {
  call(request: ModerationPrompt): Promise<ModerationResponse>;
}
