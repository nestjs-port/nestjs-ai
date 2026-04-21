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

export interface CategoryScoresProps {
  sexual?: number;
  hate?: number;
  harassment?: number;
  selfHarm?: number;
  sexualMinors?: number;
  hateThreatening?: number;
  violenceGraphic?: number;
  selfHarmIntent?: number;
  selfHarmInstructions?: number;
  harassmentThreatening?: number;
  violence?: number;
  dangerousAndCriminalContent?: number;
  health?: number;
  financial?: number;
  law?: number;
  pii?: number;
}

/**
 * This class represents the scores for different categories of content. Each category has
 * a score ranging from 0.0 to 1.0. The scores represent the severity or intensity of the
 * content in each respective category.
 */
export class CategoryScores {
  private readonly _sexual: number;
  private readonly _hate: number;
  private readonly _harassment: number;
  private readonly _selfHarm: number;
  private readonly _sexualMinors: number;
  private readonly _hateThreatening: number;
  private readonly _violenceGraphic: number;
  private readonly _selfHarmIntent: number;
  private readonly _selfHarmInstructions: number;
  private readonly _harassmentThreatening: number;
  private readonly _violence: number;
  private readonly _dangerousAndCriminalContent: number;
  private readonly _health: number;
  private readonly _financial: number;
  private readonly _law: number;
  private readonly _pii: number;

  constructor(props: CategoryScoresProps = {}) {
    this._sexual = props.sexual ?? 0;
    this._hate = props.hate ?? 0;
    this._harassment = props.harassment ?? 0;
    this._selfHarm = props.selfHarm ?? 0;
    this._sexualMinors = props.sexualMinors ?? 0;
    this._hateThreatening = props.hateThreatening ?? 0;
    this._violenceGraphic = props.violenceGraphic ?? 0;
    this._selfHarmIntent = props.selfHarmIntent ?? 0;
    this._selfHarmInstructions = props.selfHarmInstructions ?? 0;
    this._harassmentThreatening = props.harassmentThreatening ?? 0;
    this._violence = props.violence ?? 0;
    this._dangerousAndCriminalContent = props.dangerousAndCriminalContent ?? 0;
    this._health = props.health ?? 0;
    this._financial = props.financial ?? 0;
    this._law = props.law ?? 0;
    this._pii = props.pii ?? 0;
  }

  get sexual(): number {
    return this._sexual;
  }

  get hate(): number {
    return this._hate;
  }

  get harassment(): number {
    return this._harassment;
  }

  get selfHarm(): number {
    return this._selfHarm;
  }

  get sexualMinors(): number {
    return this._sexualMinors;
  }

  get hateThreatening(): number {
    return this._hateThreatening;
  }

  get violenceGraphic(): number {
    return this._violenceGraphic;
  }

  get selfHarmIntent(): number {
    return this._selfHarmIntent;
  }

  get selfHarmInstructions(): number {
    return this._selfHarmInstructions;
  }

  get harassmentThreatening(): number {
    return this._harassmentThreatening;
  }

  get violence(): number {
    return this._violence;
  }

  get dangerousAndCriminalContent(): number {
    return this._dangerousAndCriminalContent;
  }

  get health(): number {
    return this._health;
  }

  get financial(): number {
    return this._financial;
  }

  get law(): number {
    return this._law;
  }

  get pii(): number {
    return this._pii;
  }
}
