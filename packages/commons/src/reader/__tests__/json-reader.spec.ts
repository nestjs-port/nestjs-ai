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

import { assert, describe, expect, it } from "vitest";

import { JsonReader } from "../json-reader.js";

describe("JsonReader", () => {
  const bikesJsonPath = new URL("bikes.json", import.meta.url);
  const personJsonPath = new URL("person.json", import.meta.url);
  const eventsJsonPath = new URL("events.json", import.meta.url);

  it("load json array", async () => {
    const arrayResource = bikesJsonPath;
    assert.exists(arrayResource);

    const jsonReader = new JsonReader({
      resource: arrayResource,
      jsonKeysToUse: ["description"],
    });
    const documents = await jsonReader.get();

    expect(documents.length).toBeGreaterThan(0);
    for (const document of documents) {
      expect(document.text).toBeTruthy();
    }
  });

  it("load json object", async () => {
    const objectResource = personJsonPath;
    assert.exists(objectResource);

    const jsonReader = new JsonReader({
      resource: objectResource,
      jsonKeysToUse: ["description"],
    });
    const documents = await jsonReader.get();

    expect(documents.length).toBeGreaterThan(0);
    for (const document of documents) {
      expect(document.text).toBeTruthy();
    }
  });

  it("load json array from pointer", async () => {
    const eventsResource = eventsJsonPath;
    assert.exists(eventsResource);

    const jsonReader = new JsonReader({
      resource: eventsResource,
      jsonKeysToUse: ["description"],
    });
    const documents = await jsonReader.get("/0/sessions");

    expect(documents.length).toBeGreaterThan(0);
    for (const document of documents) {
      expect(document.text).toBeTruthy();
      expect(document.text).toContain("Session");
    }
  });

  it("load json object from pointer", async () => {
    const objectResource = personJsonPath;
    assert.exists(objectResource);

    const jsonReader = new JsonReader({
      resource: objectResource,
      jsonKeysToUse: ["name"],
    });
    const documents = await jsonReader.get("/store");

    expect(documents.length).toBeGreaterThan(0);
    expect(documents).toHaveLength(1);
    expect(documents[0].text).toContain("name: Bike Shop");
  });
});
