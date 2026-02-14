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
		this._patterns.push(this.normalizePattern(pattern));
		return this;
	}

	private normalizePattern(pattern: string | RegExp): RegExp {
		if (pattern instanceof RegExp) {
			const flags = pattern.flags.includes("g")
				? pattern.flags
				: `${pattern.flags}g`;
			return new RegExp(pattern.source, flags);
		}

		let source = pattern;
		const flags = new Set<string>(["g", "i"]);
		const inlineFlags = source.match(/^\(\?([a-zA-Z]+)\)/);
		if (inlineFlags?.[1]) {
			source = source.slice(inlineFlags[0].length);
			for (const flag of inlineFlags[1].toLowerCase()) {
				if (flag === "i" || flag === "m" || flag === "s" || flag === "u") {
					flags.add(flag);
				}
			}
		}

		return new RegExp(source, [...flags].join(""));
	}

	build(): ThinkingTagCleaner {
		return new ThinkingTagCleaner(this._patterns);
	}
}
