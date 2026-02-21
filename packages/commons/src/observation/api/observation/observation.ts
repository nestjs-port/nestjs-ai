import { defer, finalize, Observable, tap } from "rxjs";
import type { ObservationRegistry } from "../registry";
import type { ObservationContext } from "./observation-context";
import type { ObservationConvention } from "./observation-convention.interface";
import type { ObservationHandler } from "./observation-handler.interface";
import type { ObservationScope } from "./observation-scope.interface";

/**
 * Lifecycle wrapper around an observation context.
 * Corresponds to Micrometer's Observation.
 */
export abstract class Observation<CTX extends ObservationContext> {
  protected readonly _context: CTX;
  protected readonly _convention: ObservationConvention<CTX>;
  protected readonly _handlers: ObservationHandler<CTX>[];
  protected readonly _registry: ObservationRegistry;

  protected constructor(
    context: CTX,
    convention: ObservationConvention<CTX>,
    handlers: ObservationHandler<CTX>[],
    registry: ObservationRegistry,
  ) {
    this._context = context;
    this._convention = convention;
    this._handlers = handlers;
    this._registry = registry;
  }

  abstract get context(): CTX;
  abstract get convention(): ObservationConvention<CTX>;
  abstract get handlers(): readonly ObservationHandler<CTX>[];
  abstract contextualName(contextualName: string | null): this;
  abstract start(): this;
  abstract openScope(): ObservationScope;
  abstract error(err: Error): this;
  abstract stop(): void;
  abstract notifyOnScopeOpened(): void;
  abstract notifyOnScopeClosed(): void;

  /**
   * Convenience method: start → open scope → execute fn → close scope → stop (with error handling).
   */
  async observe<T>(fn: () => Promise<T>): Promise<T> {
    this.start();
    const scope = this.openScope();
    const wrapped = this._handlers.reduceRight(
      (next, handler) =>
        handler.runInScope
          ? () => {
              // biome-ignore lint/style/noNonNullAssertion: guarded by truthy check above
              return handler.runInScope!(this._context, next);
            }
          : next,
      fn,
    );
    try {
      return await this._registry.runInScope(scope, wrapped);
    } catch (err) {
      this.error(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      scope.close();
      this.stop();
    }
  }

  /**
   * Convenience method for RxJS streams:
   * start → open scope → subscribe in scope → close scope → stop (with error handling).
   */
  observeStream<T>(streamFactory: () => Observable<T>): Observable<T> {
    return defer(() => {
      this.start();
      const scope = this.openScope();

      return defer(() => streamFactory()).pipe(
        this.withObservationScope(scope),
        tap({
          error: (error: unknown) => {
            this.error(
              error instanceof Error ? error : new Error(String(error)),
            );
          },
        }),
        finalize(() => {
          scope.close();
          this.stop();
        }),
      );
    });
  }

  private withObservationScope<T>(
    scope: ObservationScope,
  ): (source: Observable<T>) => Observable<T> {
    return (source: Observable<T>) =>
      new Observable<T>((subscriber) => {
        try {
          return this._registry.runInScope(scope, () =>
            source.subscribe(subscriber),
          );
        } catch (error) {
          subscriber.error(error);
          return;
        }
      });
  }
}
