import { StructuredOutputConverter } from "./structured-output-converter.js";

export class ListOutputConverter extends StructuredOutputConverter<string[]> {
  get format(): string {
    return `Respond with only a list of comma-separated values, without any leading or trailing text.
Example format: foo, bar, baz`;
  }

  async convert(source: string): Promise<string[]> {
    if (source.length === 0) {
      return [];
    }
    return source.split(",").map((value) => value.trim());
  }
}
