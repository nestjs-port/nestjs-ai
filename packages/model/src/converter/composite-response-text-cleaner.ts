import assert from "node:assert/strict";
import type { ResponseTextCleaner } from "./response-text-cleaner";

export class CompositeResponseTextCleaner implements ResponseTextCleaner {
	private readonly _cleaners: ResponseTextCleaner[];

	constructor(cleaners: ResponseTextCleaner[] = []) {
		assert(cleaners, "cleaners cannot be null");
		this._cleaners = [...cleaners];
	}

	clean(text: string | null): string | null {
		let result = text;
		for (const cleaner of this._cleaners) {
			result = cleaner.clean(result);
		}
		return result;
	}

	static builder(): CompositeResponseTextCleanerBuilder {
		return new CompositeResponseTextCleanerBuilder();
	}
}

export class CompositeResponseTextCleanerBuilder {
	private readonly _cleaners: ResponseTextCleaner[] = [];

	addCleaner(cleaner: ResponseTextCleaner): this {
		assert(cleaner, "cleaner cannot be null");
		this._cleaners.push(cleaner);
		return this;
	}

	build(): CompositeResponseTextCleaner {
		return new CompositeResponseTextCleaner(this._cleaners);
	}
}
