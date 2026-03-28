export interface McpClientCustomizer<B> {
  customize(name: string, componentBuilder: B): void;
}
