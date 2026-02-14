import type { ResponseTextCleaner } from "./response-text-cleaner";

export class WhitespaceCleaner implements ResponseTextCleaner {
	clean(text: string | null): string | null {
		return text != null ? text.trim() : text;
	}
}
