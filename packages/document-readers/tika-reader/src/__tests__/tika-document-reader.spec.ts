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

import { resolve } from "node:path";
import { ExtractedTextFormatter } from "@nestjs-ai/commons";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { TikaDocumentReader } from "../index.js";

describe("TikaDocumentReader", () => {
  const wordSampleDocx = resolve(__dirname, "word-sample.docx");
  const wordSampleDoc = resolve(__dirname, "word-sample.doc");
  const sample2Pdf = resolve(__dirname, "sample2.pdf");
  const samplePpt = resolve(__dirname, "sample.ppt");
  const samplePptx = resolve(__dirname, "sample.pptx");

  let tikaContainer: StartedTestContainer | null;
  let tikaServerUrl: string;

  beforeAll(async () => {
    tikaContainer = await new GenericContainer("apache/tika:3.2.3.0")
      .withExposedPorts(9998)
      .start();

    tikaServerUrl = `http://${tikaContainer.getHost()}:${tikaContainer.getMappedPort(9998)}`;
  }, 120_000);

  afterAll(async () => {
    await tikaContainer?.stop();
  }, 30_000);

  it.each([
    [
      wordSampleDocx,
      "word-sample.docx",
      "Two kinds of links are possible, those that refer to an external website",
    ],
    [
      wordSampleDoc,
      "word-sample.doc",
      "The limited permissions granted above are perpetual and will not be revoked by OASIS",
    ],
    [
      sample2Pdf,
      "sample2.pdf",
      "Consultdoc/pdftex/manual.pdf from your tetex distribution for more",
    ],
    [
      samplePpt,
      "sample.ppt",
      "Sed ipsum tortor, fringilla a consectetur eget, cursus posuere sem.",
    ],
    [
      samplePptx,
      "sample.pptx",
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    ],
    [
      "https://github.com/spring-projects/spring-ai/",
      "https://github.com/spring-projects/spring-ai/",
      "An Application Framework for AI Engineering",
    ],
  ])(
    "test docx (%s)",
    async (
      resourceUri: string,
      resourceName: string,
      contentSnipped: string,
    ) => {
      const docs = await new TikaDocumentReader({
        resource: resourceUri,
        tikaServerUrl,
      }).get();
      expect(docs).toHaveLength(1);

      const doc = docs[0];
      expect(doc?.metadata).toHaveProperty(TikaDocumentReader.METADATA_SOURCE);
      expect(doc?.metadata[TikaDocumentReader.METADATA_SOURCE]).toBe(
        resourceName,
      );
      expect(doc?.text).toContain(contentSnipped);
    },
    120_000,
  );

  it.each([
    [
      wordSampleDocx,
      "word-sample.docx",
      "This document demonstrates the ability of the calibre DOCX Input plugin",
    ],
    [sample2Pdf, "sample2.pdf", "Robert Maron"],
    [samplePpt, "sample.ppt", "Sample FILE"],
    [samplePptx, "sample.pptx", "Sample FILE"],
  ])(
    "test reader with formatter (%s)",
    async (
      resourceUri: string,
      resourceName: string,
      contentSnipped: string,
    ) => {
      const formatter = ExtractedTextFormatter.builder()
        .withNumberOfTopTextLinesToDelete(5)
        .build();

      let docs = await new TikaDocumentReader({
        resource: resourceUri,
        tikaServerUrl,
        textFormatter: formatter,
      }).get();

      expect(docs).toHaveLength(1);

      let doc = docs[0];
      expect(doc?.metadata).toHaveProperty(TikaDocumentReader.METADATA_SOURCE);
      expect(doc?.metadata[TikaDocumentReader.METADATA_SOURCE]).toBe(
        resourceName,
      );
      expect((doc?.text ?? "").includes(contentSnipped)).toBe(false);

      docs = await new TikaDocumentReader({
        resource: resourceUri,
        tikaServerUrl,
      }).get();
      doc = docs[0];
      expect(doc?.text).toContain(contentSnipped);
    },
    120_000,
  );
});
