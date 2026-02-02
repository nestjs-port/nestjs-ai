import { Content } from "./content";
import type { Part } from "./part.interface";

/**
 * Builder for creating Content instances.
 * Provides fluent API for setting parts and role.
 */
export class ContentBuilder {
	private _parts: Part[] | null = null;
	private _role: string | null = null;

	parts(parts: Part[]): ContentBuilder;
	parts(...parts: Part[]): ContentBuilder;
	parts(parts: Part[] | Part): ContentBuilder {
		if (Array.isArray(parts)) {
			this._parts = parts;
		} else {
			this._parts = [parts];
		}
		return this;
	}

	role(role: string): ContentBuilder {
		this._role = role;
		return this;
	}

	clearParts(): ContentBuilder {
		this._parts = null;
		return this;
	}

	clearRole(): ContentBuilder {
		this._role = null;
		return this;
	}

	build(): Content {
		return new Content(this._parts, this._role);
	}
}
