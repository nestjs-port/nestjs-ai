import { describe, expect, it } from "vitest";
import { CompositeResponseTextCleaner } from "../composite-response-text-cleaner";
import { MarkdownCodeBlockCleaner } from "../markdown-code-block-cleaner";
import type { ResponseTextCleaner } from "../response-text-cleaner";
import { ThinkingTagCleaner } from "../thinking-tag-cleaner";
import { WhitespaceCleaner } from "../whitespace-cleaner";

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
