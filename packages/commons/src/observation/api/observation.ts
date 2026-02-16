import type { ObservationContext } from "./observation-context";
import type { ObservationConvention } from "./observation-convention.interface";
import type { ObservationHandler } from "./observation-handler.interface";
import type { ObservationRegistry } from "./observation-registry.interface";
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
					? () => handler.runInScope?.(this._context, next)
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
}
