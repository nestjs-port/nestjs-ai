import { Document } from "@nestjs-ai/commons";
import { PromptTemplate } from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";
import { Query } from "../../../query";
import { ContextualQueryAugmenter } from "../contextual-query-augmenter";
import type { QueryAugmenter } from "../query-augmenter";

describe("ContextualQueryAugmenter", () => {
  it("when prompt has missing context placeholder then throw", () => {
    const customPromptTemplate = new PromptTemplate(
      "You are the boss. Query: {query}",
    );

    expect(
      () =>
        new ContextualQueryAugmenter({
          promptTemplate: customPromptTemplate,
        }),
    ).toThrow(
      "The following placeholders must be present in the prompt template: context",
    );
  });

  it("when prompt has missing query placeholder then throw", () => {
    const customPromptTemplate = new PromptTemplate(
      "You are the boss. Context: {context}",
    );

    expect(
      () =>
        new ContextualQueryAugmenter({
          promptTemplate: customPromptTemplate,
        }),
    ).toThrow(
      "The following placeholders must be present in the prompt template: query",
    );
  });

  it("when query is null then throw", () => {
    const augmenter: QueryAugmenter = new ContextualQueryAugmenter();

    expect(() => augmenter.augment(null as unknown as Query, [])).toThrow(
      "query cannot be null",
    );
  });

  it("when documents is null then throw", () => {
    const augmenter: QueryAugmenter = new ContextualQueryAugmenter();
    const query = new Query("test query");

    expect(() =>
      augmenter.augment(query, null as unknown as Document[]),
    ).toThrow("documents cannot be null");
  });

  it("when documents is empty and allow empty context then return original query", () => {
    const augmenter: QueryAugmenter = new ContextualQueryAugmenter({
      allowEmptyContext: true,
    });
    const query = new Query("test query");

    const augmentedQuery = augmenter.augment(query, []);

    expect(augmentedQuery).toBe(query);
  });

  it("when documents is empty and not allow empty context then return augmented query with custom template", () => {
    const emptyContextPromptTemplate = new PromptTemplate(
      "No context available.",
    );
    const augmenter: QueryAugmenter = new ContextualQueryAugmenter({
      emptyContextPromptTemplate,
    });
    const query = new Query("test query");

    const augmentedQuery = augmenter.augment(query, []);

    expect(augmentedQuery.text).toBe(emptyContextPromptTemplate.template);
  });

  it("when documents are provided then return augmented query with custom template", () => {
    const promptTemplate = new PromptTemplate(`Context:
{context}

Query:
{query}
`);
    const augmenter: QueryAugmenter = new ContextualQueryAugmenter({
      promptTemplate,
    });
    const query = new Query("test query");
    const documents = [
      new Document("content1", {}),
      new Document("content2", {}),
    ];

    const augmentedQuery = augmenter.augment(query, documents);

    expect(augmentedQuery.text).toBe(`Context:
content1
content2

Query:
test query
`);
  });
});
