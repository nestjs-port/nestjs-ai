import { ObservationContext } from "@nestjs-ai/commons";
import {
	type Context,
	type ContextManager,
	context as otelContext,
	ROOT_CONTEXT,
	type Span,
	SpanStatusCode,
	type Tracer,
	trace,
} from "@opentelemetry/api";
import { describe, expect, it, vi } from "vitest";
import { OtelTracingObservationHandler } from "../otel-tracing-observation-handler";

function createTracerWithSpan(span: Span): {
	tracer: Tracer;
	startSpan: ReturnType<typeof vi.fn>;
} {
	const startSpan = vi.fn(() => span);
	const tracer = {
		startSpan,
		startActiveSpan: vi.fn(),
	} as unknown as Tracer;
	return { tracer, startSpan };
}

describe("OtelTracingObservationHandler", () => {
	it("should create span on start and end span on stop with attributes", () => {
		const span = {
			updateName: vi.fn().mockReturnThis(),
			setAttribute: vi.fn().mockReturnThis(),
			recordException: vi.fn(),
			setStatus: vi.fn().mockReturnThis(),
			end: vi.fn(),
		} as unknown as Span;
		const { tracer, startSpan } = createTracerWithSpan(span);
		const handler = new OtelTracingObservationHandler(tracer);
		const context = new ObservationContext();
		context.name = "ai.chat";
		context.contextualName = "chat gpt-4o";
		context.addLowCardinalityKeyValue("model", "gpt-4o");
		context.addHighCardinalityKeyValue("prompt.size", "123");

		handler.onStart(context);
		handler.onStop(context);

		expect(startSpan).toHaveBeenCalledWith("chat gpt-4o");
		expect(span.updateName).toHaveBeenCalledWith("chat gpt-4o");
		expect(span.setAttribute).toHaveBeenCalledWith("model", "gpt-4o");
		expect(span.setAttribute).toHaveBeenCalledWith("prompt.size", "123");
		expect(span.end).toHaveBeenCalledTimes(1);
	});

	it("should record error and set status when observation has error", () => {
		const span = {
			updateName: vi.fn().mockReturnThis(),
			setAttribute: vi.fn().mockReturnThis(),
			recordException: vi.fn(),
			setStatus: vi.fn().mockReturnThis(),
			end: vi.fn(),
		} as unknown as Span;
		const { tracer } = createTracerWithSpan(span);
		const handler = new OtelTracingObservationHandler(tracer);
		const context = new ObservationContext();
		context.name = "ai.chat";
		context.error = new Error("boom");

		handler.onStart(context);
		handler.onStop(context);

		expect(span.recordException).toHaveBeenCalledWith(context.error);
		expect(span.setStatus).toHaveBeenCalledWith({
			code: SpanStatusCode.ERROR,
			message: "boom",
		});
		expect(span.end).toHaveBeenCalledTimes(1);
	});

	it("should be safe when stop is called without start", () => {
		const tracer = {
			startSpan: vi.fn(),
		} as unknown as Tracer;
		const handler = new OtelTracingObservationHandler(tracer);
		const context = new ObservationContext();

		expect(() => handler.onStop(context)).not.toThrow();
	});

	it("should expose active span in runInScope", async () => {
		class TestContextManager implements ContextManager {
			private current: Context = ROOT_CONTEXT;

			active(): Context {
				return this.current;
			}

			with<A extends unknown[], F extends (...args: A) => ReturnType<F>>(
				context: Context,
				fn: F,
				thisArg?: ThisParameterType<F>,
				...args: A
			): ReturnType<F> {
				const previous = this.current;
				this.current = context;
				try {
					return fn.call(thisArg, ...args);
				} finally {
					this.current = previous;
				}
			}

			bind<T>(_context: Context, target: T): T {
				return target;
			}

			enable(): this {
				return this;
			}

			disable(): this {
				this.current = ROOT_CONTEXT;
				return this;
			}
		}

		const span = {
			updateName: vi.fn().mockReturnThis(),
			setAttribute: vi.fn().mockReturnThis(),
			recordException: vi.fn(),
			setStatus: vi.fn().mockReturnThis(),
			end: vi.fn(),
		} as unknown as Span;
		const { tracer } = createTracerWithSpan(span);
		const handler = new OtelTracingObservationHandler(tracer);
		const context = new ObservationContext();
		context.name = "ai.chat";
		const manager = new TestContextManager().enable();
		otelContext.setGlobalContextManager(manager);

		try {
			handler.onStart(context);
			await handler.runInScope(context, async () => {
				expect(trace.getSpan(otelContext.active())).toBe(span);
			});
		} finally {
			otelContext.disable();
		}
	});
});
