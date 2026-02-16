import { Prompt } from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";

import type { Advisor } from "../../advisor";
import { ChatClientAttributes } from "../../chat-client-attributes";
import { ChatClientRequest } from "../../chat-client-request";
import { ChatClientResponse } from "../../chat-client-response";
import { ChatClientObservationContext } from "../chat-client-observation-context";

function createAdvisor(name: string): Advisor {
	return {
		get order() {
			return 0;
		},
		get name() {
			return name;
		},
	};
}

describe("ChatClientObservationContext", () => {
	it("when mandatory request options then return", () => {
		const observationContext = ChatClientObservationContext.builder()
			.request(ChatClientRequest.builder().prompt(new Prompt("Hello")).build())
			.build();

		expect(observationContext).toBeDefined();
	});

	it("when null request then throw", () => {
		expect(() => {
			ChatClientObservationContext.builder()
				.request(null as unknown as ChatClientRequest)
				.build();
		}).toThrow("chatClientRequest cannot be null");
	});

	it("when null advisors then throw", () => {
		expect(() => {
			ChatClientObservationContext.builder()
				.request(
					ChatClientRequest.builder().prompt(new Prompt("Hello")).build(),
				)
				.advisors(null as unknown as Advisor[])
				.build();
		}).toThrow("advisors cannot be null");
	});

	it("when advisors contain null then throw", () => {
		expect(() => {
			ChatClientObservationContext.builder()
				.request(
					ChatClientRequest.builder().prompt(new Prompt("Hello")).build(),
				)
				.advisors([createAdvisor("first"), null as unknown as Advisor])
				.build();
		}).toThrow("advisors cannot contain null elements");
	});

	it("when format provided then sets output format in request context", () => {
		const observationContext = ChatClientObservationContext.builder()
			.request(ChatClientRequest.builder().prompt(new Prompt("Hello")).build())
			.format("json_schema")
			.build();

		expect(
			observationContext.request.context.get(
				ChatClientAttributes.OUTPUT_FORMAT.key,
			),
		).toBe("json_schema");
		expect(observationContext.format).toBe("json_schema");
	});

	it("when set response then returns same response", () => {
		const observationContext = ChatClientObservationContext.builder()
			.request(ChatClientRequest.builder().prompt(new Prompt("Hello")).build())
			.build();
		const response = ChatClientResponse.builder().build();

		observationContext.response = response;

		expect(observationContext.response).toBe(response);
	});
});
