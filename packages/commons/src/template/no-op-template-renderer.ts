import assert from "node:assert/strict";
import type { TemplateRenderer } from "./template-renderer.interface";

export class NoOpTemplateRenderer implements TemplateRenderer {
	apply(template: string, variables: Record<string, unknown | null>): string {
		assert(
			template != null && template.length > 0,
			"template cannot be null or empty",
		);
		assert(variables != null, "variables cannot be null");
		// Note: In JavaScript, object keys are always strings, so null keys are not possible
		// This check is kept for consistency with Java API but will never fail in practice
		const keys = Object.keys(variables);
		for (const key of keys) {
			assert(key != null, "variables keys cannot be null");
		}
		return template;
	}
}
