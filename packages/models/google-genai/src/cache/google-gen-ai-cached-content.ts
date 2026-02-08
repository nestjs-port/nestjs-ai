import assert from "node:assert/strict";
import type {
	CachedContent,
	CachedContentUsageMetadata,
	Content,
} from "@google/genai";
import { type Milliseconds, ms } from "@nestjs-ai/commons";

export interface GoogleGenAiCachedContentProps {
	name?: string;
	model?: string;
	displayName?: string;
	createTime?: string;
	updateTime?: string;
	expireTime?: string;
	ttl?: Milliseconds;
	contents?: Content[];
	systemInstruction?: Content;
	usageMetadata?: CachedContentUsageMetadata;
}

export class GoogleGenAiCachedContent {
	private readonly _name?: string;
	private readonly _model?: string;
	private readonly _displayName?: string;
	private readonly _systemInstruction?: Content;
	private readonly _contents?: Content[];
	private readonly _createTime?: string;
	private readonly _updateTime?: string;
	private readonly _expireTime?: string;
	private readonly _ttl?: Milliseconds;
	private readonly _usageMetadata?: CachedContentUsageMetadata;

	constructor(props: GoogleGenAiCachedContentProps) {
		assert(props.model, "Model must not be empty");

		this._name = props.name;
		this._model = props.model;
		this._displayName = props.displayName;
		this._systemInstruction = props.systemInstruction;
		this._contents = props.contents;
		this._createTime = props.createTime;
		this._updateTime = props.updateTime;
		this._expireTime = props.expireTime;
		this._ttl = props.ttl;
		this._usageMetadata = props.usageMetadata;
	}

	static from(
		cachedContent?: CachedContent | null,
	): GoogleGenAiCachedContent | null {
		if (!cachedContent) {
			return null;
		}

		return new GoogleGenAiCachedContent({
			name: cachedContent.name,
			model: cachedContent.model,
			displayName: cachedContent.displayName,
			createTime: cachedContent.createTime,
			updateTime: cachedContent.updateTime,
			expireTime: cachedContent.expireTime,
			// Note: ttl, contents, and systemInstruction are not available in the SDK's
			// CachedContent
			// These would be set during creation via CreateCachedContentConfig
			usageMetadata: cachedContent.usageMetadata,
		});
	}

	get name(): string | undefined {
		return this._name;
	}

	get model(): string | undefined {
		return this._model;
	}

	get displayName(): string | undefined {
		return this._displayName;
	}

	get systemInstruction(): Content | undefined {
		return this._systemInstruction;
	}

	get contents(): Content[] | undefined {
		return this._contents;
	}

	get createTime(): string | undefined {
		return this._createTime;
	}

	get updateTime(): string | undefined {
		return this._updateTime;
	}

	get expireTime(): string | undefined {
		return this._expireTime;
	}

	get ttl(): Milliseconds | undefined {
		return this._ttl;
	}

	get usageMetadata(): CachedContentUsageMetadata | undefined {
		return this._usageMetadata;
	}

	get expired(): boolean {
		if (!this._expireTime) {
			return false;
		}
		return new Date() > new Date(this._expireTime);
	}

	get remainingTtl(): Milliseconds | null {
		if (!this._expireTime) {
			return null;
		}
		const remaining = new Date(this._expireTime).getTime() - Date.now();
		return remaining < 0 ? ms(0) : ms(remaining);
	}
}
