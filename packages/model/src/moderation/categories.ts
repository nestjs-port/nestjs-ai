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

export interface CategoriesProps {
  sexual?: boolean;
  hate?: boolean;
  harassment?: boolean;
  selfHarm?: boolean;
  sexualMinors?: boolean;
  hateThreatening?: boolean;
  violenceGraphic?: boolean;
  selfHarmIntent?: boolean;
  selfHarmInstructions?: boolean;
  harassmentThreatening?: boolean;
  violence?: boolean;
  dangerousAndCriminalContent?: boolean;
  health?: boolean;
  financial?: boolean;
  law?: boolean;
  pii?: boolean;
}

/**
 * The Categories class represents a set of categories used to classify content. Each
 * category can be either true (indicating that the content belongs to the category) or
 * false (indicating that the content does not belong to the category).
 */
export class Categories {
  private readonly _sexual: boolean;
  private readonly _hate: boolean;
  private readonly _harassment: boolean;
  private readonly _selfHarm: boolean;
  private readonly _sexualMinors: boolean;
  private readonly _hateThreatening: boolean;
  private readonly _violenceGraphic: boolean;
  private readonly _selfHarmIntent: boolean;
  private readonly _selfHarmInstructions: boolean;
  private readonly _harassmentThreatening: boolean;
  private readonly _violence: boolean;
  private readonly _dangerousAndCriminalContent: boolean;
  private readonly _health: boolean;
  private readonly _financial: boolean;
  private readonly _law: boolean;
  private readonly _pii: boolean;

  constructor(props: CategoriesProps = {}) {
    this._sexual = props.sexual ?? false;
    this._hate = props.hate ?? false;
    this._harassment = props.harassment ?? false;
    this._selfHarm = props.selfHarm ?? false;
    this._sexualMinors = props.sexualMinors ?? false;
    this._hateThreatening = props.hateThreatening ?? false;
    this._violenceGraphic = props.violenceGraphic ?? false;
    this._selfHarmIntent = props.selfHarmIntent ?? false;
    this._selfHarmInstructions = props.selfHarmInstructions ?? false;
    this._harassmentThreatening = props.harassmentThreatening ?? false;
    this._violence = props.violence ?? false;
    this._dangerousAndCriminalContent =
      props.dangerousAndCriminalContent ?? false;
    this._health = props.health ?? false;
    this._financial = props.financial ?? false;
    this._law = props.law ?? false;
    this._pii = props.pii ?? false;
  }

  get sexual(): boolean {
    return this._sexual;
  }

  get hate(): boolean {
    return this._hate;
  }

  get harassment(): boolean {
    return this._harassment;
  }

  get selfHarm(): boolean {
    return this._selfHarm;
  }

  get sexualMinors(): boolean {
    return this._sexualMinors;
  }

  get hateThreatening(): boolean {
    return this._hateThreatening;
  }

  get violenceGraphic(): boolean {
    return this._violenceGraphic;
  }

  get selfHarmIntent(): boolean {
    return this._selfHarmIntent;
  }

  get selfHarmInstructions(): boolean {
    return this._selfHarmInstructions;
  }

  get harassmentThreatening(): boolean {
    return this._harassmentThreatening;
  }

  get violence(): boolean {
    return this._violence;
  }

  get dangerousAndCriminalContent(): boolean {
    return this._dangerousAndCriminalContent;
  }

  get health(): boolean {
    return this._health;
  }

  get financial(): boolean {
    return this._financial;
  }

  get law(): boolean {
    return this._law;
  }

  get pii(): boolean {
    return this._pii;
  }
}
