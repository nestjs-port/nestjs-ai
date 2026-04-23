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
import { CompositeResponseTextCleaner } from "../composite-response-text-cleaner.js";
import { MarkdownCodeBlockCleaner } from "../markdown-code-block-cleaner.js";
import type { ResponseTextCleaner } from "../response-text-cleaner.js";
import { ThinkingTagCleaner } from "../thinking-tag-cleaner.js";
import { WhitespaceCleaner } from "../whitespace-cleaner.js";

describe("CompositeResponseTextCleaner", () => {
  it("applies cleaners in order", () => {
    const cleaner = CompositeResponseTextCleaner.builder()
      .addCleaner({
        clean: (text: string | null) => text?.replaceAll("A", "B") ?? text,
      })
      .addCleaner({
        clean: (text: string | null) => text?.replaceAll("B", "C") ?? text,
      })
      .build();

    expect(cleaner.clean("AAA")).toBe("CCC");
  });

  it("works with a single cleaner", () => {
    const trimCleaner: ResponseTextCleaner = {
      clean: (text: string | null) => text?.trim() ?? text,
    };
    const cleaner = new CompositeResponseTextCleaner([trimCleaner]);
    expect(cleaner.clean("  content  ")).toBe("content");
  });

  it("works with multiple cleaners", () => {
    const cleaner = new CompositeResponseTextCleaner([
      new WhitespaceCleaner(),
      new ThinkingTagCleaner(),
      new MarkdownCodeBlockCleaner(),
    ]);

    const input = `<thinking>Reasoning</thinking>
\`\`\`json
{"key": "value"}
\`\`\`
`;
    expect(cleaner.clean(input)).toBe('{"key": "value"}');
  });

  it("handles complex pipeline", () => {
    const cleaner = CompositeResponseTextCleaner.builder()
      .addCleaner(new WhitespaceCleaner())
      .addCleaner(new ThinkingTagCleaner())
      .addCleaner(new MarkdownCodeBlockCleaner())
      .addCleaner(new WhitespaceCleaner())
      .build();

    const input = `

<thinking>Let me analyze this</thinking>
<think>Qwen style thinking</think>

\`\`\`json
{
\t"result": "test"
}
\`\`\`

`;

    expect(cleaner.clean(input)).toBe('{\n\t"result": "test"\n}');
  });

  it("throws when cleaner is null", () => {
    expect(() =>
      CompositeResponseTextCleaner.builder().addCleaner(
        null as unknown as ResponseTextCleaner,
      ),
    ).toThrow("cleaner cannot be null");
  });

  it("handles empty cleaners list", () => {
    const cleaner = new CompositeResponseTextCleaner();
    const input = "test content";
    expect(cleaner.clean(input)).toBe(input);
  });
});
