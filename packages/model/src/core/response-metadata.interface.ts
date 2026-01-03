export interface ResponseMetadata {
	get<T>(key: string): T | null;
	getRequired<T>(key: string): T;
	containsKey(key: string): boolean;
	getOrDefault<T>(key: string, defaultValue: T): T;
	entries(): Array<[string, unknown]>;
	keys(): string[];
	isEmpty(): boolean;
}

export abstract class AbstractResponseMetadata implements ResponseMetadata {
	protected readonly map: Map<string, unknown> = new Map();

	get<T>(key: string): T | null {
		return (this.map.get(key) as T) ?? null;
	}

	getRequired<T>(key: string): T {
		if (!this.map.has(key)) {
			throw new Error(`Required key '${key}' not found in metadata`);
		}
		return this.map.get(key) as T;
	}

	containsKey(key: string): boolean {
		return this.map.has(key);
	}

	getOrDefault<T>(key: string, defaultValue: T): T {
		return this.map.has(key) ? (this.map.get(key) as T) : defaultValue;
	}

	entries(): Array<[string, unknown]> {
		return Array.from(this.map.entries());
	}

	keys(): string[] {
		return Array.from(this.map.keys());
	}

	isEmpty(): boolean {
		return this.map.size === 0;
	}

	protected set(key: string, value: unknown): void {
		this.map.set(key, value);
	}
}
