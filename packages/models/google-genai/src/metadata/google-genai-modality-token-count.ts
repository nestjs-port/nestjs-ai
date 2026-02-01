/**
 * Modality types supported by Google GenAI.
 */
export type Modality =
	| "TEXT"
	| "IMAGE"
	| "AUDIO"
	| "VIDEO"
	| "DOCUMENT"
	| "UNKNOWN";

/**
 * Represents token count information for a specific modality (text, image, audio, video).
 */
export class GoogleGenAiModalityTokenCount {
	/**
	 * The modality type (e.g., "TEXT", "IMAGE", "AUDIO", "VIDEO").
	 */
	readonly modality: Modality;

	/**
	 * The number of tokens for this modality.
	 */
	readonly tokenCount: number;

	constructor(modality: Modality, tokenCount: number) {
		this.modality = modality;
		this.tokenCount = tokenCount;
	}

	/**
	 * Creates a GoogleGenAiModalityTokenCount from SDK response data.
	 * @param data - The modality token count data from SDK
	 * @returns A new GoogleGenAiModalityTokenCount instance
	 */
	static from(
		data: { modality?: string; tokenCount?: number } | null | undefined,
	): GoogleGenAiModalityTokenCount | null {
		if (!data) {
			return null;
		}

		const modality = convertModality(data.modality);
		const tokens = data.tokenCount ?? 0;

		return new GoogleGenAiModalityTokenCount(modality, tokens);
	}

	toString(): string {
		return `GoogleGenAiModalityTokenCount{modality='${this.modality}', tokenCount=${this.tokenCount}}`;
	}
}

function convertModality(modality: string | undefined): Modality {
	if (!modality) {
		return "UNKNOWN";
	}

	const modalityStr = modality.toUpperCase();

	switch (modalityStr) {
		case "TEXT":
		case "IMAGE":
		case "VIDEO":
		case "AUDIO":
		case "DOCUMENT":
			return modalityStr as Modality;
		case "MODALITY_UNSPECIFIED":
		case "MEDIA_MODALITY_UNSPECIFIED":
			return "UNKNOWN";
		default:
			return "UNKNOWN";
	}
}
