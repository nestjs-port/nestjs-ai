import assert from "node:assert/strict";
import type { Content } from "@google/genai";
import { ms } from "@nestjs-ai/commons";
import { beforeEach, describe, expect, it } from "vitest";
import { CachedContentRequest } from "../cached-content-request";
import { CachedContentUpdateRequest } from "../cached-content-update-request";
import { CachedContentException } from "../google-gen-ai-cached-content-service";
import { TestGoogleGenAiCachedContentService } from "./test-google-gen-ai-cached-content-service";

describe("GoogleGenAiCachedContentService", () => {
  let service: TestGoogleGenAiCachedContentService;

  beforeEach(() => {
    service = new TestGoogleGenAiCachedContentService();
  });

  it("should create cached content", () => {
    const model = "gemini-2.0-flash";
    const displayName = "Test Cache";
    const ttl = ms(3_600_000); // 1 hour

    const systemContent: Content = {
      parts: [{ text: "You are a helpful assistant." }],
    };

    const contextContent: Content = {
      parts: [{ text: "Additional context here." }],
    };

    const request = CachedContentRequest.builder()
      .model(model)
      .displayName(displayName)
      .systemInstruction(systemContent)
      .addContent(contextContent)
      .ttl(ttl)
      .build();

    const result = service.create(request);

    expect(result).toBeDefined();
    expect(result.name).toMatch(/^cachedContent\//);
    expect(result.model).toBe(model);
    expect(result.displayName).toBe(displayName);
    expect(result.ttl).toBe(ttl);
    expect(result.contents).toContainEqual(contextContent);
    expect(result.systemInstruction).toEqual(systemContent);
    expect(result.createTime).toBeDefined();

    // Verify it's stored
    assert(result.name, "result.name must be defined");
    expect(service.contains(result.name)).toBe(true);
    expect(service.size).toBe(1);
  });

  it("should get cached content", () => {
    const content: Content = {
      parts: [{ text: "Test content" }],
    };

    const request = CachedContentRequest.builder()
      .model("gemini-2.0-flash")
      .displayName("Test Cache")
      .addContent(content)
      .ttl(ms(3_600_000))
      .build();

    const created = service.create(request);
    assert(created.name, "created.name must be defined");
    const name = created.name;

    const retrieved = service.get(name);

    expect(retrieved).toBeDefined();
    expect(retrieved?.name).toBe(name);
    expect(retrieved?.model).toBe(created.model);
    expect(retrieved?.displayName).toBe(created.displayName);
  });

  it("should return undefined for non-existent cached content", () => {
    const result = service.get("cachedContent/nonexistent");
    expect(result).toBeUndefined();
  });

  it("should update cached content", () => {
    const content: Content = {
      parts: [{ text: "Test content" }],
    };

    const createRequest = CachedContentRequest.builder()
      .model("gemini-2.0-flash")
      .displayName("Original Name")
      .addContent(content)
      .ttl(ms(3_600_000))
      .build();

    const created = service.create(createRequest);
    assert(created.name, "created.name must be defined");
    const name = created.name;

    // Update with new TTL
    const newTtl = ms(7_200_000); // 2 hours
    const updateRequest = new CachedContentUpdateRequest({ ttl: newTtl });

    const updated = service.update(name, updateRequest);

    expect(updated).toBeDefined();
    expect(updated.name).toBe(name);
    expect(updated.ttl).toBe(newTtl);
    expect(updated.updateTime).toBeDefined();
    assert(updated.updateTime, "updated.updateTime must be defined");
    assert(created.createTime, "created.createTime must be defined");
    expect(new Date(updated.updateTime).getTime()).toBeGreaterThanOrEqual(
      new Date(created.createTime).getTime(),
    );
  });

  it("should throw when updating non-existent cached content", () => {
    const updateRequest = new CachedContentUpdateRequest({
      ttl: ms(7_200_000),
    });

    expect(() =>
      service.update("cachedContent/nonexistent", updateRequest),
    ).toThrow(CachedContentException);
    expect(() =>
      service.update("cachedContent/nonexistent", updateRequest),
    ).toThrow("Cached content not found");
  });

  it("should delete cached content", () => {
    const content: Content = {
      parts: [{ text: "Test content" }],
    };

    const request = CachedContentRequest.builder()
      .model("gemini-2.0-flash")
      .displayName("To Delete")
      .addContent(content)
      .ttl(ms(3_600_000))
      .build();

    const created = service.create(request);
    assert(created.name, "created.name must be defined");
    const name = created.name;

    expect(service.contains(name)).toBe(true);

    const deleted = service.delete(name);
    expect(deleted).toBe(true);

    expect(service.contains(name)).toBe(false);
    expect(service.get(name)).toBeUndefined();
  });

  it("should return false when deleting non-existent cached content", () => {
    const deleted = service.delete("cachedContent/nonexistent");
    expect(deleted).toBe(false);
  });

  it("should list cached content", () => {
    for (let i = 0; i < 3; i++) {
      const content: Content = {
        parts: [{ text: `Content ${i}` }],
      };

      const request = CachedContentRequest.builder()
        .model("gemini-2.0-flash")
        .displayName(`Cache ${i}`)
        .addContent(content)
        .ttl(ms((i + 1) * 3_600_000))
        .build();
      service.create(request);
    }

    const page = service.list(10, undefined);

    expect(page).toBeDefined();
    expect(page.contents).toHaveLength(3);
    expect(page.hasNextPage).toBe(false);
  });

  it("should list empty cached content", () => {
    const page = service.list(10, undefined);

    expect(page).toBeDefined();
    expect(page.contents).toHaveLength(0);
    expect(page.hasNextPage).toBe(false);
  });

  it("should detect expired cached content", () => {
    const content: Content = {
      parts: [{ text: "Test content" }],
    };

    const expiredTime = new Date(Date.now() - 3_600_000); // 1 hour ago
    const request = CachedContentRequest.builder()
      .model("gemini-2.0-flash")
      .displayName("Expired Cache")
      .addContent(content)
      .expireTime(expiredTime)
      .build();

    const cached = service.create(request);

    expect(cached.expired).toBe(true);
    expect(cached.remainingTtl).toBe(ms(0));
  });

  it("should detect non-expired cached content", () => {
    const content: Content = {
      parts: [{ text: "Test content" }],
    };

    const futureTime = new Date(Date.now() + 3_600_000); // 1 hour from now
    const request = CachedContentRequest.builder()
      .model("gemini-2.0-flash")
      .displayName("Valid Cache")
      .addContent(content)
      .expireTime(futureTime)
      .build();

    const cached = service.create(request);

    expect(cached.expired).toBe(false);
    expect(cached.remainingTtl).toBeDefined();
    // Remaining TTL should be approximately 1 hour (within 1 hour tolerance)
    assert(cached.remainingTtl != null, "cached.remainingTtl must be defined");
    const remainingHours = cached.remainingTtl / 3_600_000;
    expect(remainingHours).toBeGreaterThan(0);
    expect(remainingHours).toBeLessThanOrEqual(1);
  });

  it("should clear all cached content", () => {
    for (let i = 0; i < 3; i++) {
      const content: Content = {
        parts: [{ text: `Content ${i}` }],
      };

      const request = CachedContentRequest.builder()
        .model("gemini-2.0-flash")
        .displayName(`Cache ${i}`)
        .addContent(content)
        .ttl(ms(3_600_000))
        .build();
      service.create(request);
    }

    expect(service.size).toBe(3);

    service.clearAll();

    expect(service.size).toBe(0);
    const page = service.list(10, undefined);
    expect(page.contents).toHaveLength(0);
  });
});
