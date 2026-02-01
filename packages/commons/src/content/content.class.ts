import type { Part } from "./part.interface";

/**
 * Data structure that contains content parts and role.
 * Used in Google's generative AI API to represent messages.
 */
export class Content {
	public readonly parts: Part[];
	public readonly role: string | null;

	constructor(parts: Part[] | null, role: string | null) {
		this.parts = parts ?? [];
		this.role = role;
	}

	getParts(): Part[] {
		return this.parts;
	}

	getRole(): string | null {
		return this.role;
	}
}
