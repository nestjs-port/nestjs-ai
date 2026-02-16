import type {
  ObservationContext,
  ObservationHandler,
} from "@nestjs-ai/commons";
import {
  context as otelContext,
  type Span,
  SpanStatusCode,
  type Tracer,
  trace,
} from "@opentelemetry/api";

/**
 * Handler that creates and manages OpenTelemetry spans from observations.
 */
export class OtelTracingObservationHandler
  implements ObservationHandler<ObservationContext>
{
  private readonly spans = new WeakMap<ObservationContext, Span>();
  private readonly errorMarked = new WeakSet<ObservationContext>();

  constructor(private readonly tracer: Tracer) {}

  supportsContext(context: ObservationContext): context is ObservationContext {
    return Boolean(context);
  }

  onStart(context: ObservationContext): void {
    const spanName = context.contextualName ?? context.name ?? "observation";
    const span = this.tracer.startSpan(spanName);
    this.spans.set(context, span);
  }

  onError(context: ObservationContext): void {
    const span = this.spans.get(context);
    const error = context.error;
    if (!span || !error) {
      return;
    }

    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    this.errorMarked.add(context);
  }

  async runInScope<T>(
    context: ObservationContext,
    fn: () => Promise<T>,
  ): Promise<T> {
    const span = this.spans.get(context);
    if (!span) {
      return fn();
    }

    const contextWithSpan = trace.setSpan(otelContext.active(), span);
    return otelContext.with(contextWithSpan, fn);
  }

  onStop(context: ObservationContext): void {
    const span = this.spans.get(context);
    if (!span) {
      return;
    }

    const spanName = context.contextualName ?? context.name;
    if (spanName) {
      span.updateName(spanName);
    }

    for (const [key, value] of context.lowCardinalityKeyValues) {
      span.setAttribute(key, value);
    }

    for (const [key, value] of context.highCardinalityKeyValues) {
      span.setAttribute(key, value);
    }

    if (context.error && !this.errorMarked.has(context)) {
      span.recordException(context.error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: context.error.message,
      });
    }

    span.end();
    this.spans.delete(context);
    this.errorMarked.delete(context);
  }
}
