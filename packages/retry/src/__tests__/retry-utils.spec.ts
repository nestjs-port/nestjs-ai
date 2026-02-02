import { RetryException } from "@nestjs-ai/commons";
import { describe, expect, it } from "vitest";
import { NonTransientAiException } from "../non-transient-ai-exception";
import { RetryUtils } from "../retry-utils";
import { TransientAiException } from "../transient-ai-exception";

/**
 * RetryUtils tests
 */
describe("RetryUtils", () => {
	it("handle error 4xx", async () => {
		const response = new Response("Bad request", {
			status: 400,
			statusText: "Bad Request",
		});

		await expect(
			RetryUtils.DEFAULT_RESPONSE_ERROR_HANDLER.handleError(response),
		).rejects.toThrow(NonTransientAiException);
	});

	it("handle error 5xx", async () => {
		const response = new Response("Server error", {
			status: 500,
			statusText: "Internal Server Error",
		});

		await expect(
			RetryUtils.DEFAULT_RESPONSE_ERROR_HANDLER.handleError(response),
		).rejects.toThrow(TransientAiException);
	});

	it("has error", () => {
		const response = new Response("success", {
			status: 200,
			statusText: "OK",
		});

		expect(RetryUtils.DEFAULT_RESPONSE_ERROR_HANDLER.hasError(response)).toBe(
			false,
		);
	});

	it("short retry template retries", async () => {
		let counter = 0;
		const template = RetryUtils.SHORT_RETRY_TEMPLATE;

		await expect(
			template.execute(() => {
				counter++;
				throw new TransientAiException("test fail");
			}),
		).rejects.toThrow(RetryException);

		expect(counter).toBe(11);
	});

	it("short retry template succeeds before max attempts", async () => {
		let counter = 0;
		const template = RetryUtils.SHORT_RETRY_TEMPLATE;

		const result = await template.execute(() => {
			if (++counter < 5) {
				throw new TransientAiException("test fail");
			}
			return "success";
		});

		expect(counter).toBe(5);
		expect(result).toBe("success");
	});
});
