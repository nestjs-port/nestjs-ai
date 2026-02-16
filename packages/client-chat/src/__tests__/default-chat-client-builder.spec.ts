import { NoopObservationRegistry } from "@nestjs-ai/commons";
import type { ChatModel } from "@nestjs-ai/model";
import { describe, expect, it } from "vitest";

import { DefaultChatClient } from "../default-chat-client";
import { DefaultChatClientBuilder } from "../default-chat-client-builder";

function createChatModel(): ChatModel {
	return {} as ChatModel;
}

function getDefaultRequest(
	builder: DefaultChatClientBuilder,
): DefaultChatClient.DefaultChatClientRequestSpec {
	return (
		builder as unknown as {
			defaultRequest: DefaultChatClient.DefaultChatClientRequestSpec;
		}
	).defaultRequest;
}

function getSystemText(
	request: DefaultChatClient.DefaultChatClientRequestSpec,
): string | null {
	return (request as unknown as { _systemText: string | null })._systemText;
}

function getUserText(
	request: DefaultChatClient.DefaultChatClientRequestSpec,
): string | null {
	return (request as unknown as { _userText: string | null })._userText;
}

describe("DefaultChatClientBuilder", () => {
	it("when clone builder", () => {
		const originalBuilder = new DefaultChatClientBuilder(createChatModel());
		originalBuilder.defaultSystem("first instructions");

		const clonedBuilder = originalBuilder.clone() as DefaultChatClientBuilder;
		originalBuilder.defaultSystem("second instructions");

		expect(clonedBuilder).not.toBe(originalBuilder);

		const clonedRequest = getDefaultRequest(clonedBuilder);
		expect(clonedRequest).toBeDefined();
		expect(getSystemText(clonedRequest)).toBe("first instructions");
	});

	it("when chat model is null then throws", () => {
		expect(
			() => new DefaultChatClientBuilder(null as unknown as ChatModel),
		).toThrow("the ChatModel must be non-null");
	});

	it("when observation registry is null then throws", () => {
		expect(
			() =>
				new DefaultChatClientBuilder(
					createChatModel(),
					null as never,
					null,
					null,
				),
		).toThrow("the ObservationRegistry must be non-null");
	});

	it("when advisor observation convention is null then return", () => {
		const builder = new DefaultChatClientBuilder(
			createChatModel(),
			NoopObservationRegistry.INSTANCE,
			null,
			null,
		);
		expect(builder).toBeDefined();
	});

	it("when user resource is null then throws", () => {
		const builder = new DefaultChatClientBuilder(createChatModel());
		expect(() =>
			builder.defaultUser(null as unknown as Buffer, "utf-8"),
		).toThrow("text cannot be null");
	});

	it("when system resource is null then throws", () => {
		const builder = new DefaultChatClientBuilder(createChatModel());
		expect(() =>
			builder.defaultSystem(null as unknown as Buffer, "utf-8"),
		).toThrow("text cannot be null");
	});

	it("when template renderer is null then throws", () => {
		const builder = new DefaultChatClientBuilder(createChatModel());
		expect(() => builder.defaultTemplateRenderer(null as never)).toThrow(
			"templateRenderer cannot be null",
		);
	});

	it("when clone builder then modifying original does not affect clone", () => {
		const originalBuilder = new DefaultChatClientBuilder(createChatModel());
		originalBuilder.defaultSystem("original system");
		originalBuilder.defaultUser("original user");

		const clonedBuilder = originalBuilder.clone() as DefaultChatClientBuilder;

		originalBuilder.defaultSystem("modified system");
		originalBuilder.defaultUser("modified user");

		const clonedRequest = getDefaultRequest(clonedBuilder);
		expect(getSystemText(clonedRequest)).toBe("original system");
		expect(getUserText(clonedRequest)).toBe("original user");
	});

	it("when build chat client then returns valid instance", () => {
		const builder = new DefaultChatClientBuilder(createChatModel());
		const chatClient = builder.build();

		expect(chatClient).toBeDefined();
		expect(chatClient).toBeInstanceOf(DefaultChatClient);
	});

	it("when overriding system prompt then latest value is used", () => {
		const builder = new DefaultChatClientBuilder(createChatModel());

		builder.defaultSystem("first system prompt");
		builder.defaultSystem("second system prompt");

		const defaultRequest = getDefaultRequest(builder);
		expect(getSystemText(defaultRequest)).toBe("second system prompt");
	});

	it("when overriding user prompt then latest value is used", () => {
		const builder = new DefaultChatClientBuilder(createChatModel());

		builder.defaultUser("first user prompt");
		builder.defaultUser("second user prompt");

		const defaultRequest = getDefaultRequest(builder);
		expect(getUserText(defaultRequest)).toBe("second user prompt");
	});

	it("when default user string set then applied to request", () => {
		const builder = new DefaultChatClientBuilder(createChatModel());

		builder.defaultUser("test user prompt");

		const defaultRequest = getDefaultRequest(builder);
		expect(getUserText(defaultRequest)).toBe("test user prompt");
	});

	it("when default system string set then applied to request", () => {
		const builder = new DefaultChatClientBuilder(createChatModel());

		builder.defaultSystem("test system prompt");

		const defaultRequest = getDefaultRequest(builder);
		expect(getSystemText(defaultRequest)).toBe("test system prompt");
	});

	it("when builder method chaining then all settings applied", () => {
		const builder = new DefaultChatClientBuilder(createChatModel())
			.defaultSystem("system prompt")
			.defaultUser("user prompt") as DefaultChatClientBuilder;

		const defaultRequest = getDefaultRequest(builder);

		expect(getSystemText(defaultRequest)).toBe("system prompt");
		expect(getUserText(defaultRequest)).toBe("user prompt");
	});

	it("when clone with all settings then all are copied", () => {
		const originalBuilder = new DefaultChatClientBuilder(createChatModel())
			.defaultSystem("system prompt")
			.defaultUser("user prompt") as DefaultChatClientBuilder;

		const clonedBuilder = originalBuilder.clone() as DefaultChatClientBuilder;
		const clonedRequest = getDefaultRequest(clonedBuilder);

		expect(getSystemText(clonedRequest)).toBe("system prompt");
		expect(getUserText(clonedRequest)).toBe("user prompt");
	});

	it("when builder used multiple times then produces different instances", () => {
		const builder = new DefaultChatClientBuilder(createChatModel());

		const client1 = builder.build();
		const client2 = builder.build();

		expect(client1).not.toBe(client2);
		expect(client1).toBeInstanceOf(DefaultChatClient);
		expect(client2).toBeInstanceOf(DefaultChatClient);
	});

	it("when default user with template variables then processed", () => {
		const builder = new DefaultChatClientBuilder(createChatModel());

		builder.defaultUser("Hello {name}, welcome to {service}!");

		const defaultRequest = getDefaultRequest(builder);
		expect(getUserText(defaultRequest)).toBe(
			"Hello {name}, welcome to {service}!",
		);
	});

	it("when multiple system settings then last one wins", () => {
		const builder = new DefaultChatClientBuilder(createChatModel());

		builder.defaultSystem("first system message");
		builder.defaultSystem("final system message");

		const defaultRequest = getDefaultRequest(builder);
		expect(getSystemText(defaultRequest)).toBe("final system message");
	});
});
