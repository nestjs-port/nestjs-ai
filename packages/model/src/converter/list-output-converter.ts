import type { StructuredOutputConverter } from "./structured-output-converter";

export class ListOutputConverter
  implements StructuredOutputConverter<string[]>
{
  get format(): string {
    return `Respond with only a list of comma-separated values, without any leading or trailing text.
Example format: foo, bar, baz`;
  }

  convert(source: string): string[] {
    if (source.length === 0) {
      return [];
    }
    return source.split(",").map((value) => value.trim());
  }
}
