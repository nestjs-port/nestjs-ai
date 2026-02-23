import assert from "node:assert/strict";
import type { IdGenerator } from "@nestjs-ai/commons";
import {
  type Content,
  Document,
  DocumentMetadata,
  RandomIdGenerator,
  StringUtils,
} from "@nestjs-ai/commons";

export interface SimpleVectorStoreContentProps {
  id?: string | null;
  text?: string;
  content?: string;
  metadata?: Record<string, unknown>;
  idGenerator?: IdGenerator;
  embedding: number[];
}

export interface SimpleVectorStoreContentJson {
  id?: string | null;
  text?: string;
  content?: string;
  metadata?: Record<string, unknown>;
  embedding: number[];
}

export class SimpleVectorStoreContent implements Content {
  private readonly _id: string;
  private readonly _text: string;
  private readonly _metadata: Record<string, unknown>;
  private readonly _embedding: number[];

  constructor({
    id = null,
    text,
    content,
    metadata = {},
    idGenerator = new RandomIdGenerator(),
    embedding,
  }: SimpleVectorStoreContentProps) {
    if (id != null) {
      assert(StringUtils.hasText(id), "id must not be null or empty");
    }
    const resolvedText = text ?? content;
    assert(resolvedText != null, "content must not be null");
    assert(metadata != null, "metadata must not be null");
    assert(embedding != null, "embedding must not be null");
    assert(embedding.length > 0, "embedding vector must not be empty");

    this._id = id ?? idGenerator.generateId(resolvedText, metadata);
    this._text = resolvedText;
    this._metadata = Object.freeze({ ...metadata });
    this._embedding = [...embedding];
  }

  get id(): string {
    return this._id;
  }

  get text(): string {
    return this._text;
  }

  get metadata(): Record<string, unknown> {
    return this._metadata;
  }

  get embedding(): number[] {
    return [...this._embedding];
  }

  static fromJSON(
    json: SimpleVectorStoreContentJson,
  ): SimpleVectorStoreContent {
    assert(json != null, "json must not be null");
    assert(Array.isArray(json.embedding), "embedding must be an array");
    return new SimpleVectorStoreContent({
      id: json.id ?? null,
      text: json.text,
      content: json.content,
      metadata: json.metadata ?? {},
      embedding: [...json.embedding],
    });
  }

  toJSON(): Omit<SimpleVectorStoreContentJson, "content"> {
    return {
      id: this._id,
      text: this._text,
      metadata: { ...this._metadata },
      embedding: [...this._embedding],
    };
  }

  toDocument(score: number): Document {
    const metadata = {
      ...this._metadata,
      [DocumentMetadata.DISTANCE]: 1.0 - score,
    };
    return Document.builder()
      .id(this._id)
      .text(this._text)
      .metadata(metadata)
      .score(score)
      .build();
  }
}
