import { describe, expect, it } from "vitest";
import { ExceptionTypeFilter } from "../support/exception-type-filter";

/**
 * Unit tests for {@link ExceptionTypeFilter}.
 */
describe("ExceptionTypeFilter", () => {
  let filter: ExceptionTypeFilter;

  // Helper functions
  function assertMatches(candidate: Error): void {
    expect(filter.match(candidate)).toBe(true);
  }

  function assertDoesNotMatch(candidate: Error): void {
    expect(filter.match(candidate)).toBe(false);
  }

  function assertMatchesCause(candidate: Error): void {
    expect(filter.match(candidate, true)).toBe(true);
  }

  function assertDoesNotMatchCause(candidate: Error): void {
    expect(filter.match(candidate, true)).toBe(false);
  }

  it("empty filter", () => {
    filter = new ExceptionTypeFilter([], []);

    assertMatches(new Error());
    assertMatches(new TypeError());
    assertMatches(new RangeError());
    assertMatches(new CustomError());

    assertMatchesCause(new Error());
    assertMatchesCause(new TypeError());
    assertMatchesCause(new RangeError());
    assertMatchesCause(new CustomError());
  });

  it("includes", () => {
    filter = new ExceptionTypeFilter(
      [FileNotFoundException, IllegalArgumentException],
      [],
    );

    assertMatches(new FileNotFoundException());
    assertMatches(new IllegalArgumentException());
    assertMatches(new NumberFormatException());

    assertDoesNotMatch(new Error());
    assertDoesNotMatch(new FileSystemException("test"));
  });

  it("includes subtype matching", () => {
    filter = new ExceptionTypeFilter([CustomError], []);

    assertMatches(new CustomError());
    assertMatches(new IllegalStateException());

    assertDoesNotMatch(new Error());
  });

  // gh-35583
  it("includes cause and subtype matching", () => {
    filter = new ExceptionTypeFilter([IOException], []);

    assertMatchesCause(new IOException());
    assertMatchesCause(new FileNotFoundException());
    assertMatchesCause(
      new CustomError("wrapper", { cause: new IOException() }),
    );
    assertMatchesCause(
      new CustomError("wrapper", { cause: new FileNotFoundException() }),
    );
    assertMatchesCause(
      new Error("outer", {
        cause: new CustomError("inner", { cause: new IOException() }),
      }),
    );
    assertMatchesCause(
      new Error("outer", {
        cause: new CustomError("inner", { cause: new FileNotFoundException() }),
      }),
    );

    assertDoesNotMatchCause(new Error());
  });

  it("excludes", () => {
    filter = new ExceptionTypeFilter(
      [],
      [FileNotFoundException, IllegalArgumentException],
    );

    assertDoesNotMatch(new FileNotFoundException());
    assertDoesNotMatch(new IllegalArgumentException());

    assertMatches(new Error());
    assertMatches(new AssertionError());
    assertMatches(new FileSystemException("test"));
  });

  it("excludes subtype matching", () => {
    filter = new ExceptionTypeFilter([], [IllegalArgumentException]);

    assertDoesNotMatch(new IllegalArgumentException());
    assertDoesNotMatch(new NumberFormatException());

    assertMatches(new Error());
  });

  // gh-35583
  it("excludes cause and subtype matching", () => {
    filter = new ExceptionTypeFilter([], [IOException]);

    assertDoesNotMatchCause(new IOException());
    assertDoesNotMatchCause(new FileNotFoundException());
    assertDoesNotMatchCause(
      new CustomError("wrapper", { cause: new IOException() }),
    );
    assertDoesNotMatchCause(
      new CustomError("wrapper", { cause: new FileNotFoundException() }),
    );
    assertDoesNotMatchCause(
      new Error("outer", {
        cause: new CustomError("inner", { cause: new IOException() }),
      }),
    );
    assertDoesNotMatchCause(
      new Error("outer", {
        cause: new CustomError("inner", { cause: new FileNotFoundException() }),
      }),
    );

    assertMatchesCause(new Error());
  });

  it("includes and excludes", () => {
    filter = new ExceptionTypeFilter([IOException], [FileNotFoundException]);

    assertMatches(new IOException());
    assertMatches(new FileSystemException("test"));

    assertDoesNotMatch(new FileNotFoundException());
    assertDoesNotMatch(new Error());
  });
});

// Custom error classes to simulate Java exception hierarchy

class CustomError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "CustomError";
  }
}

class IllegalStateException extends CustomError {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "IllegalStateException";
  }
}

class IOException extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "IOException";
  }
}

class FileNotFoundException extends IOException {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "FileNotFoundException";
  }
}

class FileSystemException extends IOException {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "FileSystemException";
  }
}

class IllegalArgumentException extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "IllegalArgumentException";
  }
}

class NumberFormatException extends IllegalArgumentException {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "NumberFormatException";
  }
}

class AssertionError extends Error {
  constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AssertionError";
  }
}
