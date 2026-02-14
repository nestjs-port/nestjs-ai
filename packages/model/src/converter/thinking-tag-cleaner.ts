import assert from "node:assert/strict";
import type { ResponseTextCleaner } from "./response-text-cleaner";

const DEFAULT_PATTERNS = [
	/<thinking>[\s\S]*?<\/thinking>\s*/gi,
	/<think>[\s\S]*?<\/think>\s*/gi,
	/<reasoning>[\s\S]*?<\/reasoning>\s*/gi,
	/```thinking[\s\S]*?```\s*/gi,
	/<!--\s*thinking:[\s\S]*?-->\s*/gi,
];

export class ThinkingTagCleaner implements ResponseTextCleaner {
	private readonly _patterns: RegExp[];

	constructor(patterns: RegExp[] = DEFAULT_PATTERNS) {
		assert(patterns, "patterns cannot be null");
		assert(patterns.length > 0, "patterns cannot be empty");
		this._patterns = [...patterns];
	}

	clean(text: string | null): string | null {
		if (text == null || text.length === 0) {
			return text;
		}

		if (!text.includes("<") && !text.includes("`")) {
			return text;
		}

		let result = text;
		for (const pattern of this._patterns) {
			const next = result.replace(pattern, "");
			if (next !== result) {
				result = next;
			}
		}
		return result;
	}

	static builder(): ThinkingTagCleanerBuilder {
		return new ThinkingTagCleanerBuilder();
	}
}

export class ThinkingTagCleanerBuilder {
	private _patterns: RegExp[] = [...DEFAULT_PATTERNS];
	private _useDefaultPatterns = true;

	withoutDefaultPatterns(): this {
		this._useDefaultPatterns = false;
		return this;
	}

	addPattern(pattern: string | RegExp): this {
		assert(pattern, "pattern cannot be empty");
		if (!this._useDefaultPatterns) {
			this._patterns = [];
			this._useDefaultPatterns = true;
		}
		this._patterns.push(
			typeof pattern === "string" ? new RegExp(pattern, "gi") : pattern,
		);
		return this;
	}

	build(): ThinkingTagCleaner {
		return new ThinkingTagCleaner(this._patterns);
	}
}
