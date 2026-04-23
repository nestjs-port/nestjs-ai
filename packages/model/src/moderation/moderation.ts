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

import assert from "node:assert/strict";
import type { ModerationResult } from "./moderation-result.js";

export interface ModerationProps {
  id: string;
  model: string;
  results?: ModerationResult[];
}

/**
 * The Moderation class represents the result of a moderation process. It contains the
 * moderation ID, model, and a list of moderation results.
 */
export class Moderation {
  private readonly _id: string;
  private readonly _model: string;
  private readonly _results: ModerationResult[];

  constructor(props: ModerationProps) {
    assert(props.id != null, "id is required");
    assert(props.model != null, "model is required");
    this._id = props.id;
    this._model = props.model;
    this._results = props.results ?? [];
  }

  get id(): string {
    return this._id;
  }

  get model(): string {
    return this._model;
  }

  get results(): ModerationResult[] {
    return this._results;
  }
}
