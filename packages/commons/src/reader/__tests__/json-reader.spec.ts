import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { JsonReader } from "../json-reader";

describe("JsonReader", () => {
  const bikesJsonPath = join(__dirname, "bikes.json");
  const personJsonPath = join(__dirname, "person.json");
  const eventsJsonPath = join(__dirname, "events.json");

  it("load json array", async () => {
    const arrayResource = bikesJsonPath;
    expect(arrayResource).toBeDefined();

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
    expect(objectResource).toBeDefined();

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
    expect(eventsResource).toBeDefined();

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
    expect(objectResource).toBeDefined();

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
