import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

import { Document, type DocumentReader } from "@nestjs-ai/commons";

export type TikaResource = string | URL | Buffer;
export interface TikaTextFormatter {
  format(text: string): string;
}

export interface TikaDocumentReaderProps {
  resource: TikaResource;
  tikaServerUrl: string | URL;
  textFormatter?: TikaTextFormatter;
}

export class TikaDocumentReader implements DocumentReader {
  static readonly METADATA_SOURCE = "source";
  private readonly _resource: TikaResource;
  private readonly _tikaServerUrl: string;
  private readonly _textFormatter: TikaTextFormatter;

  constructor({
    resource,
    tikaServerUrl,
    textFormatter = { format: (text: string) => text },
  }: TikaDocumentReaderProps) {
    assert(resource != null, "resource must not be null");
    assert(tikaServerUrl != null, "tikaServerUrl must not be null");
    assert(textFormatter != null, "textFormatter must not be null");

    this._resource = resource;
    this._tikaServerUrl = this._normalizeTikaEndpoint(tikaServerUrl);
    this._textFormatter = textFormatter;
  }

  async get(): Promise<Document[]> {
    try {
      const sourceBuffer = await this._readResource(this._resource);
      const extractedText = await this._extractTextByTika(sourceBuffer);
      const document = this._toDocument(extractedText);
      return [document];
    } catch (error) {
      throw new Error(
        `Failed to read document through Tika server: ${this._tikaServerUrl}`,
        { cause: error },
      );
    }
  }

  async read(): Promise<Document[]> {
    return this.get();
  }

  private async _extractTextByTika(resourceBuffer: Buffer): Promise<string> {
    const response = await fetch(this._tikaServerUrl, {
      method: "PUT",
      headers: {
        Accept: "text/plain",
      },
      body: new Uint8Array(resourceBuffer),
    });

    if (!response.ok) {
      throw new Error(
        `Tika server request failed: ${response.status} ${response.statusText}`,
      );
    }

    return response.text();
  }

  private _toDocument(docText: string): Document {
    const formattedText = this._textFormatter.format(docText ?? "");
    const document = new Document(formattedText);
    document.metadata[TikaDocumentReader.METADATA_SOURCE] =
      this._resourceIdentifier(this._resource);
    return document;
  }

  private _normalizeTikaEndpoint(tikaServerUrl: string | URL): string {
    const base = String(tikaServerUrl).replace(/\/+$/, "");
    if (base.endsWith("/tika")) {
      return base;
    }
    return `${base}/tika`;
  }

  private _resourceIdentifier(resource: TikaResource): string {
    if (Buffer.isBuffer(resource)) {
      return "buffer";
    }

    if (resource instanceof URL) {
      const resourceName = basename(resource.pathname);
      return resourceName.length > 0 ? resourceName : resource.toString();
    }

    if (resource.startsWith("classpath:/")) {
      const classpathRelative = resource.replace("classpath:/", "");
      const resourceName = basename(classpathRelative);
      return resourceName.length > 0 ? resourceName : resource;
    }

    if (resource.startsWith("http://") || resource.startsWith("https://")) {
      try {
        const parsed = new URL(resource);
        const resourceName = basename(parsed.pathname);
        return resourceName.length > 0 ? resourceName : parsed.toString();
      } catch {
        return resource;
      }
    }

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

  private async _readResource(resource: TikaResource): Promise<Buffer> {
    if (Buffer.isBuffer(resource)) {
      return resource;
    }

    if (resource instanceof URL) {
      if (resource.protocol === "file:") {
        return readFile(resource);
      }

      const response = await fetch(resource);
      if (!response.ok) {
        throw new Error(`Unable to fetch resource: ${resource.href}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    if (resource.startsWith("http://") || resource.startsWith("https://")) {
      const response = await fetch(resource);
      if (!response.ok) {
        throw new Error(`Unable to fetch resource: ${resource}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }

    if (resource.startsWith("classpath:/")) {
      const classpathRelative = resource.replace("classpath:/", "");
      return readFile(resolve(__dirname, "__tests__", classpathRelative));
    }

    return readFile(resolve(resource));
  }
}
