import assert from "node:assert/strict";
import type { Content } from "@google/genai";
import type { Milliseconds } from "@nestjs-ai/commons";

export interface CachedContentRequestProps {
  model: string;
  displayName?: string;
  contents: Content[];
  systemInstruction?: Content;
  ttl?: Milliseconds;
  expireTime?: Date;
}

export class CachedContentRequest {
  private readonly _model: string;
  private readonly _displayName?: string;
  private readonly _contents: Content[];
  private readonly _systemInstruction?: Content;
  private readonly _ttl?: Milliseconds;
  private readonly _expireTime?: Date;

  constructor(props: CachedContentRequestProps) {
    assert(props.model, "Model must not be empty");
    assert(
      props.contents && props.contents.length > 0,
      "Contents must not be empty",
    );
    assert(
      props.ttl !== undefined || props.expireTime !== undefined,
      "Either TTL or expire time must be set",
    );

    this._model = props.model;
    this._displayName = props.displayName;
    this._contents = [...props.contents];
    this._systemInstruction = props.systemInstruction;
    this._ttl = props.ttl;
    this._expireTime = props.expireTime;
  }

  get model(): string {
    return this._model;
  }

  get displayName(): string | undefined {
    return this._displayName;
  }

  get contents(): Content[] {
    return this._contents;
  }

  get systemInstruction(): Content | undefined {
    return this._systemInstruction;
  }

  get ttl(): Milliseconds | undefined {
    return this._ttl;
  }

  get expireTime(): Date | undefined {
    return this._expireTime;
  }

  static builder(): CachedContentRequestBuilder {
    return new CachedContentRequestBuilder();
  }
}

export class CachedContentRequestBuilder {
  private _model?: string;
  private _displayName?: string;
  private _contents: Content[] = [];
  private _systemInstruction?: Content;
  private _ttl?: Milliseconds;
  private _expireTime?: Date;

  model(model: string): this {
    this._model = model;
    return this;
  }

  displayName(displayName: string): this {
    this._displayName = displayName;
    return this;
  }

  contents(contents: Content[]): this {
    this._contents = contents ? [...contents] : [];
    return this;
  }

  addContent(content: Content): this {
    if (content) {
      this._contents.push(content);
    }
    return this;
  }

  addTextContent(text: string): this {
    if (text) {
      this._contents.push({ parts: [{ text }] });
    }
    return this;
  }

  systemInstruction(systemInstruction: Content | string): this {
    if (typeof systemInstruction === "string") {
      this._systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    } else {
      this._systemInstruction = systemInstruction;
    }
    return this;
  }

  ttl(ttl: Milliseconds): this {
    this._ttl = ttl;
    return this;
  }

  expireTime(expireTime: Date): this {
    this._expireTime = expireTime;
    return this;
  }

  build(): CachedContentRequest {
    assert(this._model, "Model must not be empty");
    return new CachedContentRequest({
      model: this._model,
      displayName: this._displayName,
      contents: this._contents,
      systemInstruction: this._systemInstruction,
      ttl: this._ttl,
      expireTime: this._expireTime,
    });
  }
}
