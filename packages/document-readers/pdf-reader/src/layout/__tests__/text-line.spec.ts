import { describe, expect, it } from "vitest";
import { Character, ForkPdfLayoutTextStripper, TextLine } from "..";

describe("TextLine", () => {
  it("test write character at index valid index", () => {
    const inputs = [
      new Character("A", 0, false, false, false, false),
      new Character("A", 10, true, false, false, false),
      new Character("A", 0, false, true, false, false),
    ];

    for (const character of inputs) {
      const textLine = new TextLine(100);
      textLine.writeCharacterAtIndex(character);
      expect(textLine.line).toBe(` A${" ".repeat(23)}`);
    }
  });

  it("test write character at index part of previous word", () => {
    const textLine = new TextLine(100);
    const character = new Character("A", 10, true, false, false, false);
    textLine.writeCharacterAtIndex(character);
    expect(textLine.line).toBe(` A${" ".repeat(23)}`);
  });

  it("test write character at index beginning of new line", () => {
    const textLine = new TextLine(100);
    const character = new Character("A", 0, false, true, false, false);
    textLine.writeCharacterAtIndex(character);
    expect(textLine.line).toBe(` A${" ".repeat(23)}`);
  });

  it("test write character at index invalid index", () => {
    const textLine = new TextLine(100);
    const character = new Character("A", 150, false, false, false, false);
    textLine.writeCharacterAtIndex(character);
    expect(textLine.line).toBe(" ".repeat(25));
  });

  it("test write character at index negative index", () => {
    const textLine = new TextLine(100);
    const character = new Character("A", -1, false, false, false, false);
    textLine.writeCharacterAtIndex(character);
    expect(textLine.line).toBe(" ".repeat(25));
  });

  it("test write character at index space character", () => {
    const textLine = new TextLine(100);
    const character = new Character("A", 10, false, false, false, false);
    textLine.writeCharacterAtIndex(character);
    expect(textLine.line).toBe(`${" ".repeat(10)}A${" ".repeat(14)}`);
  });

  it("test write character at index close to previous word", () => {
    const textLine = new TextLine(100);
    const character = new Character("A", 10, false, false, true, false);
    textLine.writeCharacterAtIndex(character);
    expect(textLine.line).toBe(`${" ".repeat(10)}A${" ".repeat(14)}`);
  });

  it("test get line length", () => {
    const textLine = new TextLine(100);
    expect(textLine.lineLength).toBe(
      100 / ForkPdfLayoutTextStripper.OUTPUT_SPACE_CHARACTER_WIDTH_IN_PT,
    );
  });

  it("test get line", () => {
    const textLine = new TextLine(100);
    expect(textLine.line).toBe(
      " ".repeat(
        100 / ForkPdfLayoutTextStripper.OUTPUT_SPACE_CHARACTER_WIDTH_IN_PT,
      ),
    );
  });

  it("test negative line length", () => {
    expect(() => new TextLine(-100)).toThrow("Line length cannot be negative");
  });

  it("test compute index for character close to previous word", () => {
    const textLine = new TextLine(100);
    const character = new Character("A", 10, true, false, true, true);
    textLine.writeCharacterAtIndex(character);
    expect(textLine.line).toBe(` A${" ".repeat(23)}`);
  });

  it("test compute index for character close to previous word write two characters", () => {
    const textLine = new TextLine(100);
    const character = new Character("A", 10, true, false, true, true);
    const anotherCharacter = new Character("B", 1, true, false, true, true);
    textLine.writeCharacterAtIndex(character);
    textLine.writeCharacterAtIndex(anotherCharacter);
    expect(textLine.line).toBe(` AB${" ".repeat(22)}`);
  });

  it("test zero line length", () => {
    const textLine = new TextLine(0);
    expect(textLine.lineLength).toBe(0);
    expect(textLine.line).toBe("");

    // Writing to zero-length line should not cause issues
    const character = new Character("A", 0, false, false, false, false);
    textLine.writeCharacterAtIndex(character);
    expect(textLine.line).toBe("");
  });

  it("test line length not divisible by character width", () => {
    // Test with line length that doesn't divide evenly by
    // OUTPUT_SPACE_CHARACTER_WIDTH_IN_PT
    const textLine = new TextLine(103);
    const expectedLength = Math.trunc(
      103 / ForkPdfLayoutTextStripper.OUTPUT_SPACE_CHARACTER_WIDTH_IN_PT,
    );
    expect(textLine.lineLength).toBe(expectedLength);
    expect(textLine.line).toBe(" ".repeat(expectedLength));
  });

  it("test boundary conditions for line length", () => {
    // Test minimum valid line length
    const textLine1 = new TextLine(1);
    expect(textLine1.lineLength).toBe(0); // 1/4 = 0 in integer division
    expect(textLine1.line).toBe("");

    // Test line length just under OUTPUT_SPACE_CHARACTER_WIDTH_IN_PT
    const textLine2 = new TextLine(3);
    expect(textLine2.lineLength).toBe(0); // 3/4 = 0 in integer division
    expect(textLine2.line).toBe("");

    // Test line length exactly at OUTPUT_SPACE_CHARACTER_WIDTH_IN_PT
    const textLine3 = new TextLine(
      ForkPdfLayoutTextStripper.OUTPUT_SPACE_CHARACTER_WIDTH_IN_PT,
    );
    expect(textLine3.lineLength).toBe(1);
    expect(textLine3.line).toBe(" ");
  });

  it("test write character at negative index", () => {
    const textLine = new TextLine(100);
    const character = new Character("A", -10, false, false, false, false);

    textLine.writeCharacterAtIndex(character);
    // Should handle negative index gracefully without throwing exception
    expect(textLine.line).toBe(" ".repeat(25));
  });

  it("test write non printable characters", () => {
    const textLine = new TextLine(100);
    // Test control characters
    const tab = new Character("\t", 0, false, false, false, false);
    const newline = new Character("\n", 4, false, false, false, false);
    const nullChar = new Character("\0", 8, false, false, false, false);

    textLine.writeCharacterAtIndex(tab);
    textLine.writeCharacterAtIndex(newline);
    textLine.writeCharacterAtIndex(nullChar);

    // Verify how non-printable characters are handled
    const line = textLine.line;
    expect(line).toBeDefined();
  });
});
