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
import type { PDFPageProxy } from "pdfjs-dist/types/src/display/api";

import {
  ForkPdfLayoutTextStripper,
  type Region,
} from "./fork-pdf-layout-text-stripper";

export class PdfLayoutTextStripperByArea extends ForkPdfLayoutTextStripper {
  private readonly _regions: string[] = [];
  private readonly _regionArea = new Map<string, Region>();
  private readonly _regionText = new Map<string, string>();

  addRegion(regionName: string, rect: Region): void {
    this._regions.push(regionName);
    this._regionArea.set(regionName, rect);
  }

  removeRegion(regionName: string): void {
    const index = this._regions.indexOf(regionName);
    if (index >= 0) {
      this._regions.splice(index, 1);
    }
    this._regionArea.delete(regionName);
    this._regionText.delete(regionName);
  }

  getRegions(): string[] {
    return this._regions;
  }

  getTextForRegion(regionName: string): string {
    const text = this._regionText.get(regionName);
    assert(text != null, `Text for region ${regionName} not found`);
    return text;
  }

  async extractRegions(page: PDFPageProxy): Promise<void> {
    for (const regionName of this._regions) {
      const region = this._regionArea.get(regionName);
      assert(region != null, `Region ${regionName} not found`);
      const text = await this.extractTextFromPage(page, region);
      this._regionText.set(regionName, text);
    }
  }
}
