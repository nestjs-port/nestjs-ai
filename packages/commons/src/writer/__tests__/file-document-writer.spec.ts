import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { beforeEach, describe, expect, it } from "vitest";

import { Document, MetadataMode } from "../../document";
import { FileDocumentWriter } from "../file-document-writer";

async function readAllLines(path: string): Promise<string[]> {
  const content = await readFile(path, "utf8");
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  if (lines.at(-1) === "") {
    lines.pop();
  }
  return lines;
}

describe("FileDocumentWriter", () => {
  let testFileName: string;
  let testDocuments: Document[];

  beforeEach(async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "file-document-writer-test-"));
    testFileName = join(tempDir, "file-document-test-output.txt");
    testDocuments = [
      Document.builder()
        .text("Document one introduces the core functionality of Spring AI.")
        .metadata("page_number", "1")
        .metadata("end_page_number", "2")
        .metadata("source", "intro.pdf")
        .metadata("title", "Spring AI Overview")
        .metadata("author", "QA Team")
        .build(),
      Document.builder()
        .text(
          "Document two illustrates multi-line handling and line breaks.\nEnsure preservation of formatting.",
        )
        .metadata("page_number", "3")
        .metadata("end_page_number", "4")
        .metadata("source", "formatting.pdf")
        .build(),
      Document.builder()
        .text(
          "Document three checks metadata inclusion and output formatting behavior.",
        )
        .metadata("page_number", "5")
        .metadata("end_page_number", "6")
        .metadata("version", "v1.2")
        .build(),
    ];
  });

  it("testBasicWrite", async () => {
    const writer = new FileDocumentWriter({ fileName: testFileName });
    await writer.write(testDocuments);

    const lines = await readAllLines(testFileName);
    expect(lines[0]).toBe("");
    expect(lines[1]).toBe("");
    expect(lines[2]).toBe(
      "Document one introduces the core functionality of Spring AI.",
    );
    expect(lines[3]).toBe("");
    expect(lines[4]).toBe(
      "Document two illustrates multi-line handling and line breaks.",
    );
    expect(lines[5]).toBe("Ensure preservation of formatting.");
    expect(lines[6]).toBe("");
    expect(lines[7]).toBe(
      "Document three checks metadata inclusion and output formatting behavior.",
    );
  });

  it("testWriteWithDocumentMarkers", async () => {
    const writer = new FileDocumentWriter({
      fileName: testFileName,
      withDocumentMarkers: true,
      metadataMode: MetadataMode.NONE,
      append: false,
    });
    await writer.write(testDocuments);

    const lines = await readAllLines(testFileName);
    expect(lines[0]).toBe("");
    expect(lines[1]).toBe("### Doc: 0, pages:[1,2]");
    expect(lines[2]).toBe("");
    expect(lines[3]).toBe("");
    expect(lines[4]).toBe(
      "Document one introduces the core functionality of Spring AI.",
    );
    expect(lines[5]).toBe("### Doc: 1, pages:[3,4]");
    expect(lines[6]).toBe("");
    expect(lines[7]).toBe("");
    expect(lines[8]).toBe(
      "Document two illustrates multi-line handling and line breaks.",
    );
    expect(lines[9]).toBe("Ensure preservation of formatting.");
    expect(lines[10]).toBe("### Doc: 2, pages:[5,6]");
    expect(lines[11]).toBe("");
    expect(lines[12]).toBe("");
    expect(lines[13]).toBe(
      "Document three checks metadata inclusion and output formatting behavior.",
    );
  });

  it("testMetadataModeAllWithDocumentMarkers", async () => {
    const writer = new FileDocumentWriter({
      fileName: testFileName,
      withDocumentMarkers: true,
      metadataMode: MetadataMode.ALL,
      append: false,
    });
    await writer.write(testDocuments);

    const lines = await readAllLines(testFileName);
    expect(lines[0]).toBe("");
    expect(lines[1]).toBe("### Doc: 0, pages:[1,2]");
    let subListToString = lines.slice(2, 7).toString();
    expect(subListToString).toContain("page_number: 1");
    expect(subListToString).toContain("end_page_number: 2");
    expect(subListToString).toContain("source: intro.pdf");
    expect(subListToString).toContain("title: Spring AI Overview");
    expect(subListToString).toContain("author: QA Team");
    expect(lines[7]).toBe("");
    expect(lines[8]).toBe(
      "Document one introduces the core functionality of Spring AI.",
    );

    expect(lines[9]).toBe("### Doc: 1, pages:[3,4]");
    subListToString = lines.slice(10, 13).toString();
    expect(subListToString).toContain("page_number: 3");
    expect(subListToString).toContain("source: formatting.pdf");
    expect(subListToString).toContain("end_page_number: 4");
    expect(lines[13]).toBe("");
    expect(lines[14]).toBe(
      "Document two illustrates multi-line handling and line breaks.",
    );
    expect(lines[15]).toBe("Ensure preservation of formatting.");

    expect(lines[16]).toBe("### Doc: 2, pages:[5,6]");
    subListToString = lines.slice(17, 20).toString();
    expect(subListToString).toContain("page_number: 5");
    expect(subListToString).toContain("end_page_number: 6");
    expect(subListToString).toContain("version: v1.2");
    expect(lines[20]).toBe("");
    expect(lines[21]).toBe(
      "Document three checks metadata inclusion and output formatting behavior.",
    );
  });

  it("testAppendWrite", async () => {
    await writeFile(testFileName, "Test String\n", "utf8");

    const writer = new FileDocumentWriter({
      fileName: testFileName,
      withDocumentMarkers: false,
      metadataMode: MetadataMode.NONE,
      append: true,
    });
    await writer.write(testDocuments.slice(0, 2));

    const lines = await readAllLines(testFileName);
    expect(lines[0]).toBe("Test String");
    expect(lines[1]).toBe("");
    expect(lines[2]).toBe("");
    expect(lines[3]).toBe(
      "Document one introduces the core functionality of Spring AI.",
    );
    expect(lines[4]).toBe("");
    expect(lines[5]).toBe(
      "Document two illustrates multi-line handling and line breaks.",
    );
    expect(lines[6]).toBe("Ensure preservation of formatting.");
    expect(lines).toHaveLength(7);
  });
});
