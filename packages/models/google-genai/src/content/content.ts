import type { Part } from "./part.interface";

/**
 * Data structure that contains content parts and role.
 * Used in Google's generative AI API to represent messages.
 */
export class Content {
	private readonly _parts: Part[];
	private readonly _role: string | null;

	constructor(parts: Part[] | null, role: string | null) {
		this._parts = parts ?? [];
		this._role = role;
	}

	get parts(): Part[] {
		return this._parts;
	}

	get role(): string | null {
		return this._role;
	}
}
