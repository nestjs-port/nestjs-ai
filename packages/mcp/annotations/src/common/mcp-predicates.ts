export abstract class McpPredicates {
  private static readonly URI_VARIABLE_PATTERN = /\{([^/]+?)\}/;

  private constructor() {}

  static isUriTemplate(uri: string): boolean {
    return McpPredicates.URI_VARIABLE_PATTERN.test(uri);
  }
}
