import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { TextReader } from "../text-reader";

describe("TextReader", () => {
  it("load text", async () => {
    const resource = join(__dirname, "text_source.txt");
    expect(resource).toBeDefined();

    const textReader = new TextReader({ resource });
    textReader.customMetadata.customKey = "Value";

    const documents = await textReader.get();

    expect(documents).toHaveLength(1);

    for (const document of documents) {
      expect(document.metadata.customKey).toBe("Value");
      expect(document.metadata[TextReader.SOURCE_METADATA]).toBe(
        "text_source.txt",
      );
      expect(document.metadata[TextReader.CHARSET_METADATA]).toBe("utf8");
      expect(document.text).toBeTruthy();
    }
  });

  it("load text from byte array resource", async () => {
    // Test with default constructor
    const defaultByteArrayResource = Buffer.from("Test content", "utf8");
    expect(defaultByteArrayResource).toBeDefined();
    const defaultTextReader = new TextReader({
      resource: defaultByteArrayResource,
    });
    defaultTextReader.customMetadata.customKey = "DefaultValue";

    const defaultDocuments = await defaultTextReader.get();

    expect(defaultDocuments).toHaveLength(1);

    const defaultDocument = defaultDocuments[0];
    expect(defaultDocument.metadata).toMatchObject({
      customKey: "DefaultValue",
      [TextReader.CHARSET_METADATA]: "utf8",
    });

    // Assert on the SOURCE_METADATA for default ByteArrayResource
    expect(defaultDocument.metadata[TextReader.SOURCE_METADATA]).toBe("buffer");

    expect(defaultDocument.text).toBe("Test content");

    // Test with custom description constructor
    const customByteArrayResource = Buffer.from("Another test content", "utf8");
    expect(customByteArrayResource).toBeDefined();
    const customTextReader = new TextReader({
      resource: customByteArrayResource,
    });
    customTextReader.customMetadata.customKey = "CustomValue";

    const customDocuments = await customTextReader.get();

    expect(customDocuments).toHaveLength(1);

    const customDocument = customDocuments[0];
    expect(customDocument.metadata).toMatchObject({
      customKey: "CustomValue",
      [TextReader.CHARSET_METADATA]: "utf8",
    });

    // Assert on the SOURCE_METADATA for custom ByteArrayResource
    expect(customDocument.metadata[TextReader.SOURCE_METADATA]).toBe("buffer");

    expect(customDocument.text).toBe("Another test content");
  });

  it("load empty text", async () => {
    const emptyResource = Buffer.from("", "utf8");
    const textReader = new TextReader({ resource: emptyResource });

    const documents = await textReader.get();

    expect(documents).toHaveLength(1);
    expect(documents[0].text).toBe("");
    expect(documents[0].metadata[TextReader.CHARSET_METADATA]).toBe("utf8");
  });

  it("load text with only whitespace", async () => {
    const whitespaceResource = Buffer.from("   \n\t\r\n   ", "utf8");
    const textReader = new TextReader({ resource: whitespaceResource });

    const documents = await textReader.get();

    expect(documents).toHaveLength(1);
    expect(documents[0].text).toBe("   \n\t\r\n   ");
  });

  it("load text with multiple newlines", async () => {
    const content = "Line 1\n\n\nLine 4\r\nLine 5\r\n\r\nLine 7";
    const resource = Buffer.from(content, "utf8");
    const textReader = new TextReader({ resource });

    const documents = await textReader.get();

    expect(documents).toHaveLength(1);
    expect(documents[0].text).toBe(content);
  });

  it("custom metadata is preserved", async () => {
    const resource = Buffer.from("Test", "utf8");
    const textReader = new TextReader({ resource });

    // Add multiple custom metadata entries
    textReader.customMetadata.author = "Author";
    textReader.customMetadata.version = "1.0";
    textReader.customMetadata.category = "test";

    const documents = await textReader.get();

    expect(documents).toHaveLength(1);
    const document = documents[0];
    expect(document.metadata.author).toBe("Author");
    expect(document.metadata.version).toBe("1.0");
    expect(document.metadata.category).toBe("test");
  });

  it("resource description handling", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "text-reader-test-"));

    // Test with file resource
    const testFile = join(tempDir, "test-file.txt");
    await writeFile(testFile, "File content", "utf8");

    const fileReader = new TextReader({ resource: testFile });
    const documents = await fileReader.get();

    expect(documents).toHaveLength(1);
    expect(documents[0].metadata[TextReader.SOURCE_METADATA]).toBe(
      "test-file.txt",
    );
  });

  it("multiple calls to get return same result", async () => {
    const resource = Buffer.from("Consistent content", "utf8");
    const textReader = new TextReader({ resource });
    textReader.customMetadata.test = "value";

    const firstCall = await textReader.get();
    const secondCall = await textReader.get();

    expect(firstCall).toHaveLength(1);
    expect(secondCall).toHaveLength(1);
    expect(firstCall[0].text).toBe(secondCall[0].text);
    expect(firstCall[0].metadata).toEqual(secondCall[0].metadata);
  });

  it("resource without extension", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "text-reader-no-ext-test-"));

    // Test file without extension
    const noExtFile = join(tempDir, "no-extension-file");
    await writeFile(noExtFile, "Content without extension", "utf8");

    const textReader = new TextReader({ resource: noExtFile });
    const documents = await textReader.get();

    expect(documents).toHaveLength(1);
    expect(documents[0].text).toBe("Content without extension");
    expect(documents[0].metadata[TextReader.SOURCE_METADATA]).toBe(
      "no-extension-file",
    );
  });
});
