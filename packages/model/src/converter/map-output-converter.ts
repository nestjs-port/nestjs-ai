import type { StructuredOutputConverter } from "./structured-output-converter";

export class MapOutputConverter
	implements StructuredOutputConverter<Record<string, unknown>>
{
	get format(): string {
		return `Your response should be in JSON format.
The data structure for the JSON should be an object with string keys.
Do not include any explanations, only provide a RFC8259 compliant JSON response following this format without deviation.
Remove the \`\`\`json markdown surrounding the output including the trailing "\`\`\`".`;
	}

	convert(source: string): Record<string, unknown> {
		const normalized = this.normalize(source);
		const parsed = JSON.parse(normalized) as unknown;

		if (parsed === null) {
			return {};
		}
		if (typeof parsed === "object" && !Array.isArray(parsed)) {
			return parsed as Record<string, unknown>;
		}
		throw new TypeError("JSON output must be an object");
	}

	private normalize(source: string): string {
		const trimmed = source.trim();
		if (trimmed.startsWith("```json") && trimmed.endsWith("```")) {
			return trimmed.slice(7, -3).trim();
		}
		return trimmed;
	}
}
