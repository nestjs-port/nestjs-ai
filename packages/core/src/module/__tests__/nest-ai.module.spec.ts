import { HTTP_CLIENT_TOKEN } from "@nestjs-ai/commons";
import { NestAIModule } from "../nest-ai.module";

describe("NestAIModule", () => {
	it("registers default HTTP client provider in forRoot", () => {
		const dynamicModule = NestAIModule.forRoot();
		const providers = dynamicModule.providers ?? [];
		const exportsList = dynamicModule.exports ?? [];

		expect(dynamicModule.module).toBe(NestAIModule);
		expect(dynamicModule.global).toBe(true);

		const httpClientProvider = providers.find(
			(provider) =>
				typeof provider === "object" &&
				provider !== null &&
				"provide" in provider &&
				provider.provide === HTTP_CLIENT_TOKEN,
		);

		expect(httpClientProvider).toBeDefined();
		expect(
			typeof httpClientProvider === "object" &&
				httpClientProvider !== null &&
				"useValue" in httpClientProvider,
		).toBe(true);
		expect(exportsList).toContain(HTTP_CLIENT_TOKEN);
	});
});
