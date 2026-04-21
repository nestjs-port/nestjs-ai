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

export class EvaluationResponse {
  private readonly _pass: boolean;
  private readonly _score: number;
  private readonly _feedback: string;
  private readonly _metadata: Record<string, unknown>;

  constructor(
    pass: boolean,
    score: number,
    feedback: string,
    metadata: Record<string, unknown>,
  );
  constructor(
    pass: boolean,
    feedback: string,
    metadata: Record<string, unknown>,
  );
  constructor(
    pass: boolean,
    scoreOrFeedback: number | string,
    feedbackOrMetadata: string | Record<string, unknown>,
    metadata?: Record<string, unknown>,
  ) {
    this._pass = pass;
    if (typeof scoreOrFeedback === "number") {
      this._score = scoreOrFeedback;
      this._feedback = feedbackOrMetadata as string;
      this._metadata = { ...metadata };
      return;
    }

    this._score = 0;
    this._feedback = scoreOrFeedback;
    this._metadata = { ...(feedbackOrMetadata as Record<string, unknown>) };
  }

  get pass(): boolean {
    return this._pass;
  }

  get score(): number {
    return this._score;
  }

  get feedback(): string {
    return this._feedback;
  }

  get metadata(): Record<string, unknown> {
    return { ...this._metadata };
  }

  toString(): string {
    return `EvaluationResponse{pass=${this._pass}, score=${this._score}, feedback='${this._feedback}', metadata=${JSON.stringify(this._metadata)}}`;
  }
}
