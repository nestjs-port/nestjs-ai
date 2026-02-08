export interface TemplateRenderer {
	apply(template: string, variables: Record<string, unknown | null>): string;
}
