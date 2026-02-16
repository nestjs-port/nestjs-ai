import { Observation } from "./observation";
import type { ObservationContext } from "./observation-context";
import type { ObservationConvention } from "./observation-convention.interface";
import type { ObservationHandler } from "./observation-handler.interface";
import type { ObservationRegistry } from "./observation-registry.interface";
import type { ObservationScope } from "./observation-scope.interface";
import { SimpleObservationScope } from "./simple-observation-scope";

/**
 * Default observation implementation that manages lifecycle callbacks and scope nesting.
 * Corresponds to Micrometer's SimpleObservation.
 */
export class SimpleObservation<
  CTX extends ObservationContext,
> extends Observation<CTX> {
  static createNotStarted<CTX extends ObservationContext>(
    customConvention: ObservationConvention<CTX> | null,
    defaultConvention: ObservationConvention<CTX>,
    contextSupplier: () => CTX,
    registry: ObservationRegistry,
  ): Observation<CTX> {
    const context = contextSupplier();
    const effectiveConvention = customConvention ?? defaultConvention;
    const handlers = registry.handlers.filter((handler) =>
      handler.supportsContext(context),
    ) as ObservationHandler<CTX>[];

    return new SimpleObservation(
      context,
      effectiveConvention,
      handlers,
      registry,
    );
  }

  get context(): CTX {
    return this._context;
  }

  get convention(): ObservationConvention<CTX> {
    return this._convention;
  }

  get handlers(): readonly ObservationHandler<CTX>[] {
    return this._handlers;
  }

  contextualName(contextualName: string | null): this {
    this._context.contextualName = contextualName;
    return this;
  }

  start(): this {
    this._context.name = this._convention.getName();
    this._context.contextualName = this._convention.getContextualName(
      this._context,
    );

    for (const kv of this._convention.getLowCardinalityKeyValues(
      this._context,
    )) {
      this._context.addLowCardinalityKeyValue(kv.key, kv.value);
    }

    for (const handler of this._handlers) {
      handler.onStart?.(this._context);
    }

    return this;
  }

  openScope(): ObservationScope {
    const scope = new SimpleObservationScope(this._registry, this);
    this.notifyOnScopeOpened();
    return scope;
  }

  error(err: Error): this {
    this._context.error = err;
    for (const handler of this._handlers) {
      handler.onError?.(this._context);
    }
    return this;
  }

  stop(): void {
    for (const kv of this._convention.getHighCardinalityKeyValues(
      this._context,
    )) {
      this._context.addHighCardinalityKeyValue(kv.key, kv.value);
    }

    for (let i = this._handlers.length - 1; i >= 0; i--) {
      this._handlers[i].onStop?.(this._context);
    }
  }

  notifyOnScopeOpened(): void {
    for (const handler of this._handlers) {
      handler.onScopeOpened?.(this._context);
    }
  }

  notifyOnScopeClosed(): void {
    for (let i = this._handlers.length - 1; i >= 0; i--) {
      this._handlers[i].onScopeClosed?.(this._context);
    }
  }
}
