/**
 * Utility methods for string parsing.
 */
export abstract class ParsingUtils {
  /**
   * Regular expression pattern for camel case splitting.
   */
  private static readonly CAMEL_CASE_REGEX =
    /(?<!^|[\p{Lu}_$])(?=\p{Lu})|(?<!^)(?=\p{Lu}\p{Ll})/u;

  /**
   * Splits up the given camel-case string.
   * @param source must not be null.
   * @returns Array of split parts
   */
  static splitCamelCase(source: string): string[] {
    return ParsingUtils.split(source, false);
  }

  private constructor() {
    // util class
  }

  /**
   * Splits up the given camel-case string and returns the parts in lower case.
   * @param source must not be null.
   * @returns Array of split parts in lower case
   */
  static splitCamelCaseToLower(source: string): string[] {
    return ParsingUtils.split(source, true);
  }

  /**
   * Reconcatenates the given camel-case source string using the given
   * delimiter. Will split up the camel-case string and use an uncapitalized
   * version of the parts.
   * @param source must not be null.
   * @param delimiter must not be null.
   * @returns Reconcatenated string
   */
  static reConcatenateCamelCase(source: string, delimiter: string): string {
    if (source == null) {
      throw new Error("Source string must not be null");
    }
    if (delimiter == null) {
      throw new Error("Delimiter must not be null");
    }

    return ParsingUtils.splitCamelCaseToLower(source).join(delimiter);
  }

  /**
   * Splits the source string using the camel case regex pattern.
   * @param source must not be null.
   * @param toLower whether to convert parts to lower case
   * @returns Array of split parts (empty strings filtered out)
   */
  private static split(source: string, toLower: boolean): string[] {
    if (source == null) {
      throw new Error("Source string must not be null");
    }

    const parts = source.split(ParsingUtils.CAMEL_CASE_REGEX);
    const result: string[] = [];

    for (const part of parts) {
      if (part.length > 0) {
        result.push(toLower ? part.toLowerCase() : part);
      }
    }

    return result;
  }
}
