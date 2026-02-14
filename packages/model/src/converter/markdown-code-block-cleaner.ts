import type { ResponseTextCleaner } from "./response-text-cleaner";

export class MarkdownCodeBlockCleaner implements ResponseTextCleaner {
	clean(text: string | null): string | null {
		if (text == null || text.length === 0) {
			return text;
		}

		let result = text.trim();

		if (result.startsWith("```") && result.endsWith("```")) {
			const lines = result.split("\n", 2);
			if (lines[0]?.trim().toLowerCase().startsWith("```")) {
				const firstLine = lines[0].trim();
				if (firstLine.length > 3) {
					result = lines.length > 1 ? lines[1] : "";
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
