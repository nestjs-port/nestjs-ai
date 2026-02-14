import type { ResponseTextCleaner } from "./response-text-cleaner";

export class MarkdownCodeBlockCleaner implements ResponseTextCleaner {
	clean(text: string | null): string | null {
		if (text == null || text.length === 0) {
			return text;
		}

		let result = text.trim();

		if (result.startsWith("```") && result.endsWith("```")) {
			const firstNewline = result.indexOf("\n");
			const firstLine =
				firstNewline >= 0
					? result.slice(0, firstNewline).trim()
					: result.trim();
			if (firstLine.toLowerCase().startsWith("```")) {
				if (firstLine.length > 3) {
					result = firstNewline >= 0 ? result.slice(firstNewline + 1) : "";
				} else {
					result = result.substring(3);
				}
			} else {
				result = result.substring(3);
			}

			if (result.endsWith("```")) {
				result = result.substring(0, result.length - 3);
			}
			result = result.trim();
		}

		return result;
	}
}
