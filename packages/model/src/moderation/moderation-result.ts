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

import type { Categories } from "./categories";
import type { CategoryScores } from "./category-scores";

export interface ModerationResultProps {
  flagged?: boolean;
  categories?: Categories | null;
  categoryScores?: CategoryScores | null;
}

/**
 * Represents the result of a moderation process, indicating whether content was flagged,
 * the categories of moderation, and detailed scores for each category. This class is
 * designed to be constructed via its Builder inner class.
 */
export class ModerationResult {
  private _flagged: boolean;
  private _categories: Categories | null;
  private _categoryScores: CategoryScores | null;

  constructor(props: ModerationResultProps = {}) {
    this._flagged = props.flagged ?? false;
    this._categories = props.categories ?? null;
    this._categoryScores = props.categoryScores ?? null;
  }

  get flagged(): boolean {
    return this._flagged;
  }

  setFlagged(flagged: boolean): void {
    this._flagged = flagged;
  }

  get categories(): Categories | null {
    return this._categories;
  }

  setCategories(categories: Categories): void {
    this._categories = categories;
  }

  get categoryScores(): CategoryScores | null {
    return this._categoryScores;
  }

  setCategoryScores(categoryScores: CategoryScores): void {
    this._categoryScores = categoryScores;
  }
}
