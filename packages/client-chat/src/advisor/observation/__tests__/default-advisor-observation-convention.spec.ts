import {
	AiObservationAttributes,
	AiOperationType,
	AiProvider,
	KeyValue,
	ObservationContext,
	SpringAiKind,
} from "@nestjs-ai/commons";
import { Prompt } from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";
import { ChatClientRequest } from "../../../chat-client-request";
import { AdvisorObservationContext } from "../advisor-observation-context";
import { DefaultAdvisorObservationConvention } from "../default-advisor-observation-convention";

describe("DefaultAdvisorObservationConvention", () => {
	const observationConvention = new DefaultAdvisorObservationConvention();

	it("should have name", () => {
		expect(observationConvention.getName()).toBe(
			DefaultAdvisorObservationConvention.DEFAULT_NAME,
		);
	});

	it("contextual name", () => {
		const observationContext = new AdvisorObservationContext(
			"MyName",
			ChatClientRequest.builder().prompt(new Prompt("Hello")).build(),
			0,
		);

		expect(observationConvention.getContextualName(observationContext)).toBe(
			"my_name",
		);
	});

	it("supports advisor observation context", () => {
		const observationContext = new AdvisorObservationContext(
			"MyName",
			ChatClientRequest.builder().prompt(new Prompt("Hello")).build(),
			0,
		);

		expect(observationConvention.supportsContext(observationContext)).toBe(
			true,
		);
		expect(
			observationConvention.supportsContext(new ObservationContext()),
		).toBe(false);
	});

	it("should have low cardinality key values when defined", () => {
		const observationContext = new AdvisorObservationContext(
			"MyName",
			ChatClientRequest.builder().prompt(new Prompt("Hello")).build(),
			0,
		);

		expect(
			observationConvention.getLowCardinalityKeyValues(observationContext),
		).toEqual(
			expect.arrayContaining([
				KeyValue.of(
					AiObservationAttributes.AI_OPERATION_TYPE.value,
					AiOperationType.FRAMEWORK.value,
				),
				KeyValue.of(
					AiObservationAttributes.AI_PROVIDER.value,
					AiProvider.SPRING_AI.value,
				),
				KeyValue.of("spring.ai.advisor.name", "MyName"),
				KeyValue.of("spring.ai.kind", SpringAiKind.ADVISOR.value),
			]),
		);
	});

	it("should have key values when defined and response", () => {
		const observationContext = new AdvisorObservationContext(
			"MyName",
			ChatClientRequest.builder().prompt(new Prompt("Hello")).build(),
			678,
		);

		expect(
			observationConvention.getHighCardinalityKeyValues(observationContext),
		).toContainEqual(KeyValue.of("spring.ai.advisor.order", "678"));
	});
});
