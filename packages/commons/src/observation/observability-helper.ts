export abstract class ObservabilityHelper {
  static concatenateEntries(keyValues: Record<string, unknown>): string {
    const entries = Object.entries(keyValues).map(
      ([key, value]) => `"${key}":"${String(value)}"`,
    );
    return `[${entries.join(", ")}]`;
  }

  static concatenateStrings(strings: string[]): string {
    const quotedStrings = strings.map((value) => `"${value}"`);
    return `[${quotedStrings.join(", ")}]`;
  }
}
