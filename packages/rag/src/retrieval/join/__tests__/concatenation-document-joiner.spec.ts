import { Document } from "@nestjs-ai/commons";
import { describe, expect, it } from "vitest";
import { Query } from "../../../preretrieval";
import { ConcatenationDocumentJoiner } from "../concatenation-document-joiner";
import type { DocumentJoiner } from "../document-joiner";

describe("ConcatenationDocumentJoiner", () => {
  it("when documentsForQuery is null then throw", () => {
    const documentJoiner: DocumentJoiner = new ConcatenationDocumentJoiner();

    expect(() =>
      documentJoiner.apply(null as unknown as Map<Query, Document[][]>),
    ).toThrow("documentsForQuery cannot be null");
  });

  it("when documentsForQuery contains null keys then throw", () => {
    const documentJoiner: DocumentJoiner = new ConcatenationDocumentJoiner();
    const documentsForQuery = new Map<Query, Document[][]>();
    documentsForQuery.set(null as unknown as Query, []);

    expect(() => documentJoiner.apply(documentsForQuery)).toThrow(
      "documentsForQuery cannot contain null keys",
    );
  });

  it("when documentsForQuery contains null values then throw", () => {
    const documentJoiner: DocumentJoiner = new ConcatenationDocumentJoiner();
    const documentsForQuery = new Map<Query, Document[][]>();
    documentsForQuery.set(new Query("test"), null as unknown as Document[][]);

    expect(() => documentJoiner.apply(documentsForQuery)).toThrow(
      "documentsForQuery cannot contain null values",
    );
  });

  it("when no duplicated documents then all documents are joined", () => {
    const documentJoiner: DocumentJoiner = new ConcatenationDocumentJoiner();
    const documentsForQuery = new Map<Query, Document[][]>();
    documentsForQuery.set(new Query("query1"), [
      [new Document("1", "Content 1", {}), new Document("2", "Content 2", {})],
      [new Document("3", "Content 3", {})],
    ]);
    documentsForQuery.set(new Query("query2"), [
      [new Document("4", "Content 4", {})],
    ]);

    const result = documentJoiner.join(documentsForQuery);

    expect(result).toHaveLength(4);
    expect(result.map((document) => document.id).sort()).toEqual([
      "1",
      "2",
      "3",
      "4",
    ]);
  });

  it("when duplicated documents then only first occurrence is kept", () => {
    const documentJoiner: DocumentJoiner = new ConcatenationDocumentJoiner();
    const documentsForQuery = new Map<Query, Document[][]>();
    documentsForQuery.set(new Query("query1"), [
      [new Document("1", "Content 1", {}), new Document("2", "Content 2", {})],
      [new Document("3", "Content 3", {})],
    ]);
    documentsForQuery.set(new Query("query2"), [
      [new Document("2", "Content 2", {}), new Document("4", "Content 4", {})],
    ]);

    const result = documentJoiner.join(documentsForQuery);

    expect(result).toHaveLength(4);
    expect(result.map((document) => document.id).sort()).toEqual([
      "1",
      "2",
      "3",
      "4",
    ]);
    expect(
      result.filter((document) => document.text === "Content 2"),
    ).toHaveLength(1);
  });

  it("should sort documents by descending score", () => {
    const documentJoiner: DocumentJoiner = new ConcatenationDocumentJoiner();
    const documentsForQuery = new Map<Query, Document[][]>();
    documentsForQuery.set(new Query("query1"), [
      [
        Document.builder().id("1").text("Content 1").score(0.81).build(),
        Document.builder().id("2").text("Content 2").score(0.83).build(),
      ],
      [Document.builder().id("3").text("Content 3").score(null).build()],
    ]);
    documentsForQuery.set(new Query("query2"), [
      [
        Document.builder().id("4").text("Content 4").score(0.85).build(),
        Document.builder().id("5").text("Content 5").score(0.77).build(),
      ],
    ]);

    const result = documentJoiner.join(documentsForQuery);

    expect(result).toHaveLength(5);
    expect(result.map((document) => document.id)).toEqual([
      "4",
      "2",
      "1",
      "5",
      "3",
    ]);
  });
});
