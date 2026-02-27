import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";

import { Document, type DocumentReader } from "../document";

export interface TextReaderProps {
  resource: string | URL | Buffer;
  charset?: BufferEncoding;
  customMetadata?: Record<string, unknown>;
}

export class TextReader implements DocumentReader {
  static readonly CHARSET_METADATA = "charset";
  static readonly SOURCE_METADATA = "source";

  private readonly _resource: string | URL | Buffer;
  private readonly _customMetadata: Record<string, unknown>;
  private _charset: BufferEncoding;

  constructor({
    resource,
    charset = "utf8",
    customMetadata = {},
  }: TextReaderProps) {
    assert(resource != null, "The Spring Resource must not be null");
    assert(charset != null, "The charset must not be null");
    assert(customMetadata != null, "customMetadata must not be null");

    this._resource = resource;
    this._charset = charset;
    this._customMetadata = { ...customMetadata };
  }

  get charset(): BufferEncoding {
    return this._charset;
  }

  set charset(charset: BufferEncoding) {
    assert(charset != null, "The charset must not be null");
    this._charset = charset;
  }

  get customMetadata(): Record<string, unknown> {
    return this._customMetadata;
  }

  async get(): Promise<Document[]> {
    try {
      const document = await this.readResourceAsString();

      // Inject source information as a metadata.
      this._customMetadata[TextReader.CHARSET_METADATA] = this._charset;
      this._customMetadata[TextReader.SOURCE_METADATA] =
        this.getResourceIdentifier(this._resource);

      return [new Document(document, this._customMetadata)];
    } catch (error) {
      throw new Error("Error reading text resource", { cause: error });
    }
  }

  async read(): Promise<Document[]> {
    return this.get();
  }

  protected getResourceIdentifier(resource: string | URL | Buffer): string {
    if (typeof resource === "string") {
      const resourceName = basename(resource);
      if (
        resourceName.length > 0 &&
        resourceName !== "." &&
        resourceName !== "/"
      ) {
        return resourceName;
      }

      return resource;
    }

    if (resource instanceof URL) {
      const resourceName = basename(resource.pathname);
      if (resourceName.length > 0) {
        return resourceName;
      }

      return resource.toString();
    }

    return "buffer";
  }

  private async readResourceAsString(): Promise<string> {
    if (Buffer.isBuffer(this._resource)) {
      return this._resource.toString(this._charset);
    }

    if (this._resource instanceof URL) {
      const buffer = await readFile(this._resource);
      return buffer.toString(this._charset);
    }

    const resource = this._resource;
    try {
      const buffer = await readFile(resource);
      return buffer.toString(this._charset);
    } catch {
      return resource;
    }
  }
}
