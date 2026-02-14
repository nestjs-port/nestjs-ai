import { describe, expect, it } from "vitest";
import { ThinkingTagCleaner } from "../thinking-tag-cleaner";

describe("ThinkingTagCleaner", () => {
	it("removes Amazon Nova thinking tags", () => {
		const cleaner = new ThinkingTagCleaner();
		const input = "<thinking>My reasoning process</thinking>Actual content";
		expect(cleaner.clean(input)).toBe("Actual content");
	});

	it("removes Qwen think tags", () => {
		const cleaner = new ThinkingTagCleaner();
		const input = "<think>Let me think about this</think>Actual content";
		expect(cleaner.clean(input)).toBe("Actual content");
	});

	it("removes reasoning tags", () => {
		const cleaner = new ThinkingTagCleaner();
		const input = "<reasoning>Step by step reasoning</reasoning>Actual content";
		expect(cleaner.clean(input)).toBe("Actual content");
	});

	it("removes multiline thinking tags", () => {
		const cleaner = new ThinkingTagCleaner();
		const input = `<thinking>
Line 1 of thinking
Line 2 of thinking
</thinking>
Actual content`;
		expect(cleaner.clean(input)).toBe("Actual content");
	});

	it("removes multiple thinking tags", () => {
		const cleaner = new ThinkingTagCleaner();
		const input =
			"<thinking>First</thinking><think>Second</think><reasoning>Third</reasoning>Actual content";
		expect(cleaner.clean(input)).toBe("Actual content");
	});

	it("is case-insensitive", () => {
		const cleaner = new ThinkingTagCleaner();
		const input = "<THINKING>UPPER CASE</THINKING>Actual content";
		expect(cleaner.clean(input)).toBe("Actual content");
	});

	it("removes markdown thinking blocks", () => {
		const cleaner = new ThinkingTagCleaner();
		const input = "```thinking\nThis is markdown thinking\n```\nActual content";
		expect(cleaner.clean(input)).toBe("Actual content");
	});

	it("handles empty input", () => {
		const cleaner = new ThinkingTagCleaner();
		expect(cleaner.clean("")).toBe("");
		expect(cleaner.clean(null)).toBeNull();
	});

	it("returns original content without tags", () => {
		const cleaner = new ThinkingTagCleaner();
		const input = "Just regular content";
		expect(cleaner.clean(input)).toBe(input);
	});

	it("supports custom patterns", () => {
		const cleaner = new ThinkingTagCleaner([/<custom>[\s\S]*?<\/custom>\s*/gi]);
		const input = "<custom>Custom tag content</custom>Actual content";
		expect(cleaner.clean(input)).toBe("Actual content");
	});

	it("supports builder without default patterns", () => {
		const cleaner = ThinkingTagCleaner.builder()
			.withoutDefaultPatterns()
			.addPattern("(?s)<mytag>.*?</mytag>\\s*")
			.build();

		const input =
			"<thinking>Should remain</thinking><mytag>Should be removed</mytag>Content";
		expect(cleaner.clean(input)).toBe(
			"<thinking>Should remain</thinking>Content",
		);
	});

	it("supports builder with additional patterns", () => {
		const cleaner = ThinkingTagCleaner.builder()
			.addPattern("(?s)<custom>.*?</custom>\\s*")
			.build();

		const input =
			"<thinking>Removed</thinking><custom>Also removed</custom>Content";
		expect(cleaner.clean(input)).toBe("Content");
	});

	it("throws when patterns are null", () => {
		expect(() => new ThinkingTagCleaner(null as unknown as RegExp[])).toThrow(
			"patterns cannot be null",
		);
	});

	it("throws when patterns are empty", () => {
		expect(() => new ThinkingTagCleaner([])).toThrow(
			"patterns cannot be empty",
		);
	});
});
