import {
	Observation,
	type ObservationContext,
	type ObservationConvention,
	type ObservationHandler,
	type ObservationRegistry,
} from "@nestjs-ai/commons";
import { type Span, SpanStatusCode, trace } from "@opentelemetry/api";

const TRACER_NAME = "nestjs-ai";

/**
 * OpenTelemetry-backed implementation of ObservationRegistry.
 * Creates spans for each observation and delegates to registered handlers.
 */
export class OtelObservationRegistry implements ObservationRegistry {
	private readonly _handlers: ObservationHandler<any>[] = [];
	private readonly _spanMap = new WeakMap<ObservationContext, Span>();

	observation<CTX extends ObservationContext>(
		convention: ObservationConvention<CTX> | null,
		defaultConvention: ObservationConvention<CTX>,
		contextSupplier: () => CTX,
	): Observation<CTX> {
		const context = contextSupplier();
		const effectiveConvention = convention ?? defaultConvention;

		const matchingHandlers = this._handlers.filter((h) =>
			h.supportsContext(context),
		) as ObservationHandler<CTX>[];

		// Create a tracing handler that wraps OTel span management
		const tracingHandler: ObservationHandler<CTX> = {
			supportsContext: (_ctx): _ctx is CTX => true,
			onStart: (ctx: CTX) => {
				const tracer = trace.getTracer(TRACER_NAME);
				const spanName = ctx.contextualName ?? (ctx.name || "unknown");
				const span = tracer.startSpan(spanName);

				// Set low-cardinality attributes on span
				for (const [key, value] of ctx.lowCardinalityKeyValues) {
					span.setAttribute(key, value);
				}

				this._spanMap.set(ctx, span);
			},
			onError: (ctx: CTX) => {
				const span = this._spanMap.get(ctx);
				if (span && ctx.error) {
					span.setStatus({
						code: SpanStatusCode.ERROR,
						message: ctx.error.message,
					});
					span.recordException(ctx.error);
				}
			},
			onStop: (ctx: CTX) => {
				const span = this._spanMap.get(ctx);
				if (span) {
					// Set high-cardinality attributes on span
					for (const [key, value] of ctx.highCardinalityKeyValues) {
						span.setAttribute(key, value);
					}
					span.end();
					this._spanMap.delete(ctx);
				}
			},
		};

		return new Observation(context, effectiveConvention, [
			tracingHandler,
			...matchingHandlers,
		]);
	}

	addHandler(handler: ObservationHandler<any>): void {
		this._handlers.push(handler);
	}

	isNoop(): boolean {
		return false;
	}
}
