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
  expect(generation).not.toBeNull();
  if (generation == null) {
    throw new Error("Expected moderation result to be present");
  }

  const moderation = generation.output;
  expect(moderation.id).not.toBe("");
  expect(moderation.id).toBeTruthy();
  expect(moderation.results).not.toBeNull();
  expect(moderation.results.length).not.toBe(0);
  expect(moderation.model).not.toBeNull();

  return moderation;
}

function expectModerationShape(
  moderation: Moderation,
  expectedViolenceFlag: boolean,
): void {
  const result = moderation.results[0];

  expect(result.flagged).toBe(expectedViolenceFlag);

  const categories = result.categories;
  expect(categories).not.toBeNull();
  if (categories == null) {
    throw new Error("Expected moderation categories to be present");
  }

  expect(categories.sexual).not.toBeNull();
  expect(categories.hate).not.toBeNull();
  expect(categories.harassment).not.toBeNull();
  expect(categories.selfHarm).not.toBeNull();
  expect(categories.sexualMinors).not.toBeNull();
  expect(categories.hateThreatening).not.toBeNull();
  expect(categories.violenceGraphic).not.toBeNull();
  expect(categories.selfHarmIntent).not.toBeNull();
  expect(categories.selfHarmInstructions).not.toBeNull();
  expect(categories.harassmentThreatening).not.toBeNull();
  expect(categories.violence).toBe(expectedViolenceFlag);

  const scores = result.categoryScores;
  expect(scores).not.toBeNull();
  if (scores == null) {
    throw new Error("Expected moderation category scores to be present");
  }

  expect(scores.sexual).not.toBeNull();
  expect(scores.hate).not.toBeNull();
  expect(scores.harassment).not.toBeNull();
  expect(scores.selfHarm).not.toBeNull();
  expect(scores.sexualMinors).not.toBeNull();
  expect(scores.hateThreatening).not.toBeNull();
  expect(scores.violenceGraphic).not.toBeNull();
  expect(scores.selfHarmIntent).not.toBeNull();
  expect(scores.selfHarmInstructions).not.toBeNull();
  expect(scores.harassmentThreatening).not.toBeNull();
  expect(scores.violence).not.toBeNull();
}
