import type { ModalityTokenCount } from "@google/genai";
import {
	GenerateContentResponseUsageMetadata,
	MediaModality,
	TrafficType,
} from "@google/genai";
import type { Usage } from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";
import { GoogleGenAiTrafficType } from "../google-gen-ai-traffic-type";
import { GoogleGenAiUsage } from "../google-gen-ai-usage";

describe("GoogleGenAiUsage", () => {
	it("should extract basic usage", () => {
		const usageMetadata = new GenerateContentResponseUsageMetadata();
		usageMetadata.promptTokenCount = 100;
		usageMetadata.candidatesTokenCount = 50;
		usageMetadata.totalTokenCount = 150;

		const usage = GoogleGenAiUsage.from(usageMetadata);

		expect(usage.promptTokens).toBe(100);
		expect(usage.completionTokens).toBe(50);
		expect(usage.totalTokens).toBe(150);
		expect(usage.thoughtsTokenCount).toBeUndefined();
		expect(usage.cachedContentTokenCount).toBeUndefined();
		expect(usage.toolUsePromptTokenCount).toBeUndefined();
	});

	it("should extract thinking tokens", () => {
		const usageMetadata = new GenerateContentResponseUsageMetadata();
		usageMetadata.promptTokenCount = 100;
		usageMetadata.candidatesTokenCount = 50;
		usageMetadata.totalTokenCount = 175;
		usageMetadata.thoughtsTokenCount = 25;

		const usage = GoogleGenAiUsage.from(usageMetadata);

		expect(usage.promptTokens).toBe(100);
		expect(usage.completionTokens).toBe(50);
		expect(usage.totalTokens).toBe(175);
		expect(usage.thoughtsTokenCount).toBe(25);
	});

	it("should extract cached content tokens", () => {
		const usageMetadata = new GenerateContentResponseUsageMetadata();
		usageMetadata.promptTokenCount = 200;
		usageMetadata.candidatesTokenCount = 50;
		usageMetadata.totalTokenCount = 250;
		usageMetadata.cachedContentTokenCount = 80;

		const usage = GoogleGenAiUsage.from(usageMetadata);

		expect(usage.promptTokens).toBe(200);
		expect(usage.cachedContentTokenCount).toBe(80);
	});

	it("should extract tool use tokens", () => {
		const usageMetadata = new GenerateContentResponseUsageMetadata();
		usageMetadata.promptTokenCount = 100;
		usageMetadata.candidatesTokenCount = 50;
		usageMetadata.totalTokenCount = 180;
		usageMetadata.toolUsePromptTokenCount = 30;

		const usage = GoogleGenAiUsage.from(usageMetadata);

		expect(usage.toolUsePromptTokenCount).toBe(30);
	});

	it("should extract modality details", () => {
		const textModality: ModalityTokenCount = {
			modality: MediaModality.TEXT,
			tokenCount: 100,
		};

		const imageModality: ModalityTokenCount = {
			modality: MediaModality.IMAGE,
			tokenCount: 50,
		};

		const usageMetadata = new GenerateContentResponseUsageMetadata();
		usageMetadata.promptTokenCount = 150;
		usageMetadata.candidatesTokenCount = 50;
		usageMetadata.totalTokenCount = 200;
		usageMetadata.promptTokensDetails = [textModality, imageModality];
		usageMetadata.candidatesTokensDetails = [textModality];

		const usage = GoogleGenAiUsage.from(usageMetadata);

		expect(usage.promptTokensDetails).toHaveLength(2);
		expect(usage.promptTokensDetails?.[0].modality).toBe("TEXT");
		expect(usage.promptTokensDetails?.[0].tokenCount).toBe(100);
		expect(usage.promptTokensDetails?.[1].modality).toBe("IMAGE");
		expect(usage.promptTokensDetails?.[1].tokenCount).toBe(50);

		expect(usage.candidatesTokensDetails).toHaveLength(1);
		expect(usage.candidatesTokensDetails?.[0].modality).toBe("TEXT");
	});

	it("should extract ON_DEMAND traffic type", () => {
		const usageMetadata = new GenerateContentResponseUsageMetadata();
		usageMetadata.promptTokenCount = 100;
		usageMetadata.candidatesTokenCount = 50;
		usageMetadata.totalTokenCount = 150;
		usageMetadata.trafficType = TrafficType.ON_DEMAND;

		const usage = GoogleGenAiUsage.from(usageMetadata);

		expect(usage.trafficType).toBe(GoogleGenAiTrafficType.ON_DEMAND);
	});

	it("should extract PROVISIONED_THROUGHPUT traffic type", () => {
		const usageMetadata = new GenerateContentResponseUsageMetadata();
		usageMetadata.promptTokenCount = 100;
		usageMetadata.candidatesTokenCount = 50;
		usageMetadata.totalTokenCount = 150;
		usageMetadata.trafficType = TrafficType.PROVISIONED_THROUGHPUT;

		const usage = GoogleGenAiUsage.from(usageMetadata);

		expect(usage.trafficType).toBe(
			GoogleGenAiTrafficType.PROVISIONED_THROUGHPUT,
		);
	});

	it("should extract complete metadata", () => {
		const textPrompt: ModalityTokenCount = {
			modality: MediaModality.TEXT,
			tokenCount: 80,
		};

		const imagePrompt: ModalityTokenCount = {
			modality: MediaModality.IMAGE,
			tokenCount: 20,
		};

		const textCandidate: ModalityTokenCount = {
			modality: MediaModality.TEXT,
			tokenCount: 50,
		};

		const cachedText: ModalityTokenCount = {
			modality: MediaModality.TEXT,
			tokenCount: 30,
		};

		const usageMetadata = new GenerateContentResponseUsageMetadata();
		usageMetadata.promptTokenCount = 100;
		usageMetadata.candidatesTokenCount = 50;
		usageMetadata.totalTokenCount = 200;
		usageMetadata.thoughtsTokenCount = 25;
		usageMetadata.cachedContentTokenCount = 30;
		usageMetadata.toolUsePromptTokenCount = 25;
		usageMetadata.promptTokensDetails = [textPrompt, imagePrompt];
		usageMetadata.candidatesTokensDetails = [textCandidate];
		usageMetadata.cacheTokensDetails = [cachedText];
		usageMetadata.trafficType = TrafficType.ON_DEMAND;

		const usage = GoogleGenAiUsage.from(usageMetadata);

		// Verify all fields
		expect(usage.promptTokens).toBe(100);
		expect(usage.completionTokens).toBe(50);
		expect(usage.totalTokens).toBe(200);
		expect(usage.thoughtsTokenCount).toBe(25);
		expect(usage.cachedContentTokenCount).toBe(30);
		expect(usage.toolUsePromptTokenCount).toBe(25);
		expect(usage.promptTokensDetails).toHaveLength(2);
		expect(usage.candidatesTokensDetails).toHaveLength(1);
		expect(usage.cacheTokensDetails).toHaveLength(1);
		expect(usage.trafficType).toBe(GoogleGenAiTrafficType.ON_DEMAND);
		expect(usage.nativeUsage).toBeDefined();
		expect(usage.nativeUsage).toBeInstanceOf(
			GenerateContentResponseUsageMetadata,
		);
	});

	it("should handle null usage metadata", () => {
		const usage = GoogleGenAiUsage.from(undefined);

		expect(usage.promptTokens).toBe(0);
		expect(usage.completionTokens).toBe(0);
		expect(usage.totalTokens).toBe(0);
		expect(usage.thoughtsTokenCount).toBeUndefined();
		expect(usage.cachedContentTokenCount).toBeUndefined();
		expect(usage.toolUsePromptTokenCount).toBeUndefined();
		expect(usage.promptTokensDetails).toBeUndefined();
		expect(usage.candidatesTokensDetails).toBeUndefined();
		expect(usage.cacheTokensDetails).toBeUndefined();
		expect(usage.toolUsePromptTokensDetails).toBeUndefined();
		expect(usage.trafficType).toBeUndefined();
		expect(usage.nativeUsage).toBeNull();
	});

	it("should serialize to JSON", () => {
		const usage = new GoogleGenAiUsage({
			promptTokens: 100,
			completionTokens: 50,
			totalTokens: 175,
			thoughtsTokenCount: 25,
			cachedContentTokenCount: 30,
			toolUsePromptTokenCount: 15,
			trafficType: GoogleGenAiTrafficType.ON_DEMAND,
		});

		const json = JSON.stringify(usage);

		expect(json).toContain('"promptTokens":100');
		expect(json).toContain('"completionTokens":50');
		expect(json).toContain('"totalTokens":175');
		expect(json).toContain('"thoughtsTokenCount":25');
		expect(json).toContain('"cachedContentTokenCount":30');
		expect(json).toContain('"toolUsePromptTokenCount":15');
		expect(json).toContain('"trafficType":"ON_DEMAND"');
	});

	it("should be backward compatible with Usage", () => {
		const usageMetadata = new GenerateContentResponseUsageMetadata();
		usageMetadata.promptTokenCount = 100;
		usageMetadata.candidatesTokenCount = 50;
		usageMetadata.totalTokenCount = 150;
		usageMetadata.thoughtsTokenCount = 25;

		const usage: Usage = GoogleGenAiUsage.from(usageMetadata);

		// These should work through the Usage abstract class
		expect(usage.promptTokens).toBe(100);
		expect(usage.completionTokens).toBe(50);
		expect(usage.totalTokens).toBe(150);
		expect(usage.nativeUsage).toBeDefined();
	});
});
