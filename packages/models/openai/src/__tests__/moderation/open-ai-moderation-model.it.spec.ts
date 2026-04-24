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

import { assert, describe, expect, it } from "vitest";

import {
  ModerationOptionsBuilder,
  ModerationPrompt,
  type Moderation,
} from "@nestjs-ai/model";

import { OpenAiModerationModel, OpenAiModerationOptions } from "../../index.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

describe.skipIf(!OPENAI_API_KEY)("OpenAiModerationModelIT", () => {
  it("moderation as url test positive", async () => {
    const moderation = await callModeration('This is a violent message"."');

    expect(moderation.results).toHaveLength(1);
    expectModerationShape(moderation, true);
  });

  it("moderation as url test negative", async () => {
    const moderation = await callModeration(
      'A light cream colored mini golden doodle with a sign that contains the message "I\'m on my way to BARCADE!"."',
    );

    expect(moderation.results).toHaveLength(1);
    expectModerationShape(moderation, false);
  });
});

async function callModeration(instructions: string): Promise<Moderation> {
  const moderationModel = new OpenAiModerationModel({
    options: new OpenAiModerationOptions({
      apiKey: OPENAI_API_KEY ?? "",
    }),
  });

  const moderationPrompt = new ModerationPrompt(
    instructions,
    ModerationOptionsBuilder.builder()
      .model(OpenAiModerationOptions.DEFAULT_MODERATION_MODEL)
      .build(),
  );

  const moderationResponse = await moderationModel.call(moderationPrompt);
  expect(moderationResponse.results).toHaveLength(1);

  const generation = moderationResponse.result;
  assert.exists(generation);

  const moderation = generation.output;
  expect(moderation.id).not.toBe("");
  expect(moderation.id).toBeTruthy();
  assert.exists(moderation.results);
  expect(moderation.results.length).not.toBe(0);
  assert.exists(moderation.model);

  return moderation;
}

function expectModerationShape(
  moderation: Moderation,
  expectedViolenceFlag: boolean,
): void {
  const result = moderation.results[0];

  expect(result.flagged).toBe(expectedViolenceFlag);

  const categories = result.categories;
  assert.exists(categories);

  assert.exists(categories.sexual);
  assert.exists(categories.hate);
  assert.exists(categories.harassment);
  assert.exists(categories.selfHarm);
  assert.exists(categories.sexualMinors);
  assert.exists(categories.hateThreatening);
  assert.exists(categories.violenceGraphic);
  assert.exists(categories.selfHarmIntent);
  assert.exists(categories.selfHarmInstructions);
  assert.exists(categories.harassmentThreatening);
  expect(categories.violence).toBe(expectedViolenceFlag);

  const scores = result.categoryScores;
  assert.exists(scores);

  assert.exists(scores.sexual);
  assert.exists(scores.hate);
  assert.exists(scores.harassment);
  assert.exists(scores.selfHarm);
  assert.exists(scores.sexualMinors);
  assert.exists(scores.hateThreatening);
  assert.exists(scores.violenceGraphic);
  assert.exists(scores.selfHarmIntent);
  assert.exists(scores.selfHarmInstructions);
  assert.exists(scores.harassmentThreatening);
  assert.exists(scores.violence);
}
