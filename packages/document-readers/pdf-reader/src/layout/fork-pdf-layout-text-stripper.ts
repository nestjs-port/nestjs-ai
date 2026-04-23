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

import type {
  PDFPageProxy,
  TextContent,
  TextItem,
} from "pdfjs-dist/types/src/display/api.js";

export interface Region {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TextToken {
  text: string;
  x: number;
  y: number;
}

export class ForkPdfLayoutTextStripper {
  static readonly DEBUG = false;
  static readonly OUTPUT_SPACE_CHARACTER_WIDTH_IN_PT = 4;

  protected async extractTextFromPage(
    page: PDFPageProxy,
    region: Region,
  ): Promise<string> {
    const viewport = page.getViewport({ scale: 1 });
    const textContent = (await page.getTextContent({
      disableNormalization: false,
    })) as TextContent;

    const items = textContent.items
      .filter((item): item is TextItem => "str" in item)
      .map((item) => this._toTextToken(item, viewport.height))
      .filter((token) => this._contains(region, token));

    if (items.length === 0) {
      return "";
    }

    items.sort((left, right) => {
      const yDiff = Math.abs(left.y - right.y);
      if (yDiff > 2) {
        return right.y - left.y;
      }
      return left.x - right.x;
    });

    const lines: string[] = [];
    let currentLineY = items[0].y;
    let currentLine: TextToken[] = [];

    for (const item of items) {
      if (Math.abs(item.y - currentLineY) > 2) {
        lines.push(this._lineToText(currentLine));
        currentLineY = item.y;
        currentLine = [item];
      } else {
        currentLine.push(item);
      }
    }

    if (currentLine.length > 0) {
      lines.push(this._lineToText(currentLine));
    }

    return lines.join("\n");
  }

  private _lineToText(line: TextToken[]): string {
    line.sort((left, right) => left.x - right.x);

    let result = "";
    let previousEnd = 0;

    for (const token of line) {
      const spaces = Math.max(
        0,
        Math.round(
          (token.x - previousEnd) /
            ForkPdfLayoutTextStripper.OUTPUT_SPACE_CHARACTER_WIDTH_IN_PT,
        ),
      );
      if (result.length > 0) {
        result += " ".repeat(Math.min(spaces, 4));
      }
      result += token.text;
      previousEnd =
        token.x +
        token.text.length *
          ForkPdfLayoutTextStripper.OUTPUT_SPACE_CHARACTER_WIDTH_IN_PT;
    }

    return result;
  }

  private _toTextToken(item: TextItem, pageHeight: number): TextToken {
    const x = Number(item.transform[4] ?? 0);
    const y = Number(item.transform[5] ?? 0);

    // Normalize to a top-left coordinate space, to match PDFTextStripperByArea.
    return {
      text: item.str,
      x,
      y: pageHeight - y,
    };
  }

  private _contains(region: Region, token: TextToken): boolean {
    const minX = region.x;
    const maxX = region.x + region.width;
    const minY = region.y;
    const maxY = region.y + region.height;

    return (
      token.x >= minX && token.x <= maxX && token.y >= minY && token.y <= maxY
    );
  }
}
