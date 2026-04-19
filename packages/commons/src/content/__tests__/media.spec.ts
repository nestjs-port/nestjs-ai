/*
 * Copyright 2023-present the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { describe, expect, it } from "vitest";
import { Media, MediaFormat } from "../media";

describe("Media", () => {
  it("test media builder with byte array resource", () => {
    const mimeType = MediaFormat.IMAGE_PNG;
    const data = Buffer.from([1, 2, 3]);
    const id = "123";
    const name = "test-media";

    const media = new Media({ mimeType, data, id, name });

    expect(media.mimeType).toBe(mimeType);
    expect(media.data).toBeInstanceOf(Buffer);
    expect(media.dataAsByteArray).toBe(data);
    expect(media.id).toBe(id);
    expect(media.name).toBe(name);
  });

  it("test media builder with uri", () => {
    const mimeType = MediaFormat.IMAGE_PNG;
    const uri = new URL("http://example.com/image.png");
    const id = "123";
    const name = "test-media";

    const media = new Media({ mimeType, data: uri, id, name });

    expect(media.mimeType).toBe(mimeType);
    expect(media.data).toBe(uri.toString());
    expect(media.id).toBe(id);
    expect(media.name).toBe(name);
  });

  it("test media builder with URI", () => {
    const mimeType = MediaFormat.IMAGE_PNG;
    const uri = new URL("http://example.com/image.png");
    const id = "123";
    const name = "test-media";

    const media = new Media({ mimeType, data: uri, id, name });

    expect(media.mimeType).toBe(mimeType);
    expect(media.data).toBe(uri.toString());
    expect(media.id).toBe(id);
    expect(media.name).toBe(name);
  });

  it("test media builder with null mime type", () => {
    expect(
      () =>
        new Media({
          mimeType: null as unknown as MediaFormat,
          data: Buffer.from([1, 2, 3]),
        }),
    ).toThrow("MimeType must not be null");
  });

  it("test media builder with null data", () => {
    expect(
      () =>
        new Media({
          mimeType: MediaFormat.IMAGE_PNG,
          data: null as unknown as Buffer,
        }),
    ).toThrow("Data must not be null");
  });

  it("test get data as byte array with invalid data", () => {
    const media = new Media({
      mimeType: MediaFormat.IMAGE_PNG,
      data: "invalid data",
      id: "123",
      name: "test-media",
    });

    expect(() => media.dataAsByteArray).toThrow("Media data is not a buffer");
  });

  it("test media builder with null uri", () => {
    expect(
      () =>
        new Media({
          mimeType: MediaFormat.IMAGE_PNG,
          data: null as unknown as URL,
        }),
    ).toThrow("Data must not be null");
  });

  it("test media builder with null URI", () => {
    expect(
      () =>
        new Media({
          mimeType: MediaFormat.IMAGE_PNG,
          data: null as unknown as URL,
        }),
    ).toThrow("Data must not be null");
  });

  it("test media builder with optional id", () => {
    const mimeType = MediaFormat.IMAGE_PNG;
    const data = Buffer.from([1, 2, 3]);

    const media = new Media({ mimeType, data, name: "test-media" });

    expect(media.id).toBeNull();
    expect(media.name).toBe("test-media");
  });

  it("test media builder with default name", () => {
    const mimeType = MediaFormat.IMAGE_PNG;
    const data = Buffer.from([1, 2, 3]);

    const media = new Media({ mimeType, data });

    expectValidMediaName(media.name, "png");
  });

  it("test media builder with different mime types", () => {
    const data = Buffer.from([1, 2, 3]);

    const jpegMedia = new Media({
      mimeType: MediaFormat.IMAGE_JPEG,
      data,
    });
    expectValidMediaName(jpegMedia.name, "jpeg");

    const pdfMedia = new Media({
      mimeType: MediaFormat.DOC_PDF,
      data,
    });
    expectValidMediaName(pdfMedia.name, "pdf");
  });

  it("test last data method wins", () => {
    const uri = new URL("http://example.com/image.png");
    const bytes = Buffer.from([1, 2, 3]);

    const media = new Media({ mimeType: MediaFormat.IMAGE_PNG, data: bytes });

    expect(media.data).toBe(bytes);
    expect(media.data).not.toBe(uri.toString());
  });

  it("test media constructor with uri", () => {
    const mimeType = MediaFormat.IMAGE_PNG;
    const uri = new URL("http://example.com/image.png");

    const media = new Media({ mimeType, data: uri });

    expect(media.mimeType).toBe(mimeType);
    expect(media.data).toBe(uri.toString());
    expect(media.id).toBeNull();
    expectValidMediaName(media.name, "png");
  });

  it("test media constructor with url", () => {
    const mimeType = MediaFormat.IMAGE_PNG;
    const url = "http://example.com/image.png";

    const media = new Media({ mimeType, data: new URL(url) });

    expect(media.mimeType).toBe(mimeType);
    expect(media.data).toBe(url);
    expect(media.id).toBeNull();
    expectValidMediaName(media.name, "png");
  });
});

function expectValidMediaName(name: string, expectedMimeSubtype: string): void {
  expect(name).toMatch(
    new RegExp(`^media-${expectedMimeSubtype}-[0-9a-fA-F-]{36}$`),
  );
}
