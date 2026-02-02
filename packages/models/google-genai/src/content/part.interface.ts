/**
 * Represents a part of content in Google's generative AI API.
 * Parts can contain text, function calls, function responses, inline data, file data, etc.
 */
export interface Part {
	text?: string;
	functionCall?: {
		name: string;
		args?: Record<string, unknown>;
	};
	functionResponse?: {
		name: string;
		response: unknown;
	};
	inlineData?: {
		mimeType: string;
		data: string;
	};
	fileData?: {
		mimeType: string;
		fileUri: string;
	};
}
