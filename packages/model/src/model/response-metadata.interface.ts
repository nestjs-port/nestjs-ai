/**
 * Interface representing metadata associated with an AI model's response.
 */
export interface ResponseMetadata {
	/**
	 * Gets an entry from the context. Returns `null` when entry is not present.
	 * @typeParam T - value type
	 * @param key - key
	 * @returns entry or `null` if not present
	 */
	get<T>(key: string): T | null;

	/**
	 * Gets an entry from the context. Throws exception when entry is not present.
	 * @typeParam T - value type
	 * @param key - key
	 * @returns entry
	 * @throws Error if not present
	 */
	getRequired<T>(key: string): T;

	/**
	 * Checks if context contains a key.
	 * @param key - key
	 * @returns `true` when the context contains the entry with the given key
	 */
	containsKey(key: string): boolean;

	/**
	 * Returns an element or default if not present.
	 * @typeParam T - value type
	 * @param key - key
	 * @param defaultValue - default object to return
	 * @returns object or default if not present
	 */
	getOrDefault<T>(key: string, defaultValue: T): T;

	/**
	 * Returns the entries of the metadata.
	 * @returns the entries of the metadata
	 */
	entries(): Array<[string, unknown]>;

	/**
	 * Returns the keys of the metadata.
	 * @returns the keys of the metadata
	 */
	keys(): string[];

	/**
	 * Returns `true` if this map contains no key-value mappings.
	 * @returns `true` if this map contains no key-value mappings
	 */
	isEmpty(): boolean;
}

export class AbstractResponseMetadata implements ResponseMetadata {
	/**
	 * Metadata map.
	 */
	protected readonly map: Map<string, unknown> = new Map();

	/**
	 * Gets an entry from the context. Returns `null` when entry is not present.
	 * @typeParam T - value type
	 * @param key - key
	 * @returns entry or `null` if not present
	 */
	get<T>(key: string): T | null {
		return (this.map.get(key) as T) ?? null;
	}

	/**
	 * Gets an entry from the context. Throws exception when entry is not present.
	 * @typeParam T - value type
	 * @param key - key
	 * @returns entry
	 * @throws Error if not present
	 */
	getRequired<T>(key: string): T {
		if (!this.map.has(key)) {
			throw new Error(`Required key '${key}' not found in metadata`);
		}
		return this.map.get(key) as T;
	}

	/**
	 * Checks if context contains a key.
	 * @param key - key
	 * @returns `true` when the context contains the entry with the given key
	 */
	containsKey(key: string): boolean {
		return this.map.has(key);
	}

	/**
	 * Returns an element or default if not present.
	 * @typeParam T - value type
	 * @param key - key
	 * @param defaultValue - default object to return
	 * @returns object or default if not present
	 */
	getOrDefault<T>(key: string, defaultValue: T): T {
		return this.map.has(key) ? (this.map.get(key) as T) : defaultValue;
	}

	/**
	 * Returns the entries of the metadata.
	 * @returns the entries of the metadata
	 */
	entries(): Array<[string, unknown]> {
		return Array.from(this.map.entries());
	}

	/**
	 * Returns the keys of the metadata.
	 * @returns the keys of the metadata
	 */
	keys(): string[] {
		return Array.from(this.map.keys());
	}

	/**
	 * Returns `true` if this map contains no key-value mappings.
	 * @returns `true` if this map contains no key-value mappings
	 */
	isEmpty(): boolean {
		return this.map.size === 0;
	}

	/**
	 * Sets a value in the metadata map.
	 * @param key - key
	 * @param value - value
	 */
	protected set(key: string, value: unknown): void {
		this.map.set(key, value);
	}
}
