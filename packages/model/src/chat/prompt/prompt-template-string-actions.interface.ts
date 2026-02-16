export interface PromptTemplateStringActions {
  render(): string;

  render(model: Record<string, unknown>): string;
}
