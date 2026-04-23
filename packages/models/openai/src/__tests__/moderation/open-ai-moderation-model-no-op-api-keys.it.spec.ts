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

import { describe, expect, it } from "vitest";

import { ModerationPrompt } from "@nestjs-ai/model";

import { OpenAiModerationModel, OpenAiModerationOptions } from "../../index.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

describe.skipIf(!OPENAI_API_KEY)("OpenAiModerationModelNoOpApiKeysIT", () => {
  it("check no op key", async () => {
    const moderationModel = new OpenAiModerationModel({
      options: new OpenAiModerationOptions({ apiKey: "noop" }),
    });

    const prompt = new ModerationPrompt("I want to kill them..");

    await expect(moderationModel.call(prompt)).rejects.toThrow(
      "401 Incorrect API key provided: noop. You can find your API key at https://platform.openai.com/account/api-keys.",
    );
  });
});
