import type { DynamicModule, Provider } from "@nestjs/common";
import { Module } from "@nestjs/common";
import { NoopObservationRegistry } from "@nestjs-ai/commons";
import { metrics } from "@opentelemetry/api";
import { ChatModelCompletionObservationHandler } from "../handlers/chat-model-completion-observation-handler";
import { ChatModelMeterObservationHandler } from "../handlers/chat-model-meter-observation-handler";
import { ChatModelPromptContentObservationHandler } from "../handlers/chat-model-prompt-content-observation-handler";
import { ErrorLoggingObservationHandler } from "../handlers/error-logging-observation-handler";
import { OtelObservationRegistry } from "../registry/otel-observation-registry";

export const OBSERVATION_REGISTRY_TOKEN = Symbol.for(
	"OBSERVATION_REGISTRY_TOKEN",
);

export interface ObservationModuleOptions {
	/**
	 * Enable or disable observation (default: true).
	 * When disabled, a NoopObservationRegistry is used.
	 */
	enabled?: boolean;

	/**
	 * Enable token usage metrics (default: true).
	 */
	metricsEnabled?: boolean;

	/**
	 * Enable logging of prompt content (default: false).
	 */
	logPrompts?: boolean;

	/**
	 * Enable logging of completion content (default: false).
	 */
	logCompletions?: boolean;
}

@Module({})
// biome-ignore lint/complexity/noStaticOnlyClass: NestJS modules use static methods for configuration
export class ObservationModule {
	static forRoot(options: ObservationModuleOptions = {}): DynamicModule {
		const {
			enabled = true,
			metricsEnabled = true,
			logPrompts = false,
			logCompletions = false,
		} = options;

		const providers: Provider[] = [];

		providers.push({
			provide: OBSERVATION_REGISTRY_TOKEN,
			useFactory: () => {
				if (!enabled) {
					return NoopObservationRegistry.INSTANCE;
				}

				const registry = new OtelObservationRegistry();

				// Always register error logging handler
				registry.addHandler(new ErrorLoggingObservationHandler());

				if (metricsEnabled) {
					const meter = metrics.getMeter("nestjs-ai");
					registry.addHandler(new ChatModelMeterObservationHandler(meter));
				}

				if (logPrompts) {
					registry.addHandler(new ChatModelPromptContentObservationHandler());
				}

				if (logCompletions) {
					registry.addHandler(new ChatModelCompletionObservationHandler());
				}

				return registry;
			},
		});

		return {
			module: ObservationModule,
			providers,
			exports: [OBSERVATION_REGISTRY_TOKEN],
			global: true,
		};
	}
}
