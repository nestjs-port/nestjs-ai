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
