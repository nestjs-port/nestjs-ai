import assert from "node:assert/strict";
import { ChatGenerationMetadata } from "./chat-generation-metadata.interface";

/**
 * Properties for creating a DefaultChatGenerationMetadata instance.
 */
export interface DefaultChatGenerationMetadataProps {
	metadata?: Record<string, unknown>;
	finishReason?: string | null;
	contentFilters?: string[];
}

/**
 * Default implementation of {@link ChatGenerationMetadata}.
 */
export class DefaultChatGenerationMetadata extends ChatGenerationMetadata {
	private readonly _metadata: Record<string, unknown>;
	private readonly _finishReason: string | null;
	private readonly _contentFilters: string[];

	/**
	 * Create a new {@link DefaultChatGenerationMetadata} instance.
	 *
	 * @param props - the properties for creating the metadata
	 * @throws {Error} if metadata or contentFilters is null
	 */
	constructor(props: DefaultChatGenerationMetadataProps = {}) {
		super();
		assert(props.metadata !== null, "Metadata must not be null");
		assert(props.contentFilters !== null, "Content filters must not be null");
		this._metadata = { ...(props.metadata ?? {}) };
		this._finishReason = props.finishReason ?? null;
		this._contentFilters = [...(props.contentFilters ?? [])];
	}

	get<T>(key: string): T | null {
		return (this._metadata[key] as T) ?? null;
	}

	containsKey(key: string): boolean {
		return key in this._metadata;
	}

	getOrDefault<T>(key: string, defaultValue: T): T {
		const value = this.get<T>(key);
		return value !== null ? value : defaultValue;
	}

	get entrySet(): Array<[string, unknown]> {
		return Object.entries(this._metadata);
	}

	get keySet(): string[] {
		return Object.keys(this._metadata);
	}

	get isEmpty(): boolean {
		return Object.keys(this._metadata).length === 0;
	}

	get finishReason(): string | null {
		return this._finishReason;
	}

	get contentFilters(): string[] {
		return [...this._contentFilters];
	}
}
