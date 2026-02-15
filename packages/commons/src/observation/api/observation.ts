import type { ObservationContext } from "./observation-context";
import type { ObservationConvention } from "./observation-convention.interface";
import type { ObservationHandler } from "./observation-handler.interface";
import type { ObservationRegistry } from "./observation-registry.interface";
import type { ObservationScope } from "./observation-scope.interface";
import { SimpleObservationScope } from "./simple-observation-scope";

/**
 * Lifecycle wrapper around an observation context.
 * Manages the start → [error] → stop flow and delegates to handlers.
 * Corresponds to Micrometer's Observation.
 */
export class Observation<CTX extends ObservationContext> {
	private readonly _context: CTX;
	private readonly _convention: ObservationConvention<CTX>;
	private readonly _handlers: ObservationHandler<CTX>[];
	private readonly _registry: ObservationRegistry;

	constructor(
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

	/**
	 * Returns the underlying context.
	 */
	get context(): CTX {
		return this._context;
	}

	get convention(): ObservationConvention<CTX> {
		return this._convention;
	}

	get handlers(): readonly ObservationHandler<CTX>[] {
		return this._handlers;
	}

	/**
	 * Start the observation: resolve convention attributes and notify handlers.
	 */
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

	/**
	 * Open a scope for this observation.
	 * The scope will be set as the current scope in the registry.
	 */
	openScope(): ObservationScope {
		const scope = new SimpleObservationScope(this._registry, this);
		this.notifyOnScopeOpened();
		return scope;
	}

	/**
	 * Record an error and notify handlers.
	 */
	error(err: Error): this {
		this._context.error = err;
		for (const handler of this._handlers) {
			handler.onError?.(this._context);
		}
		return this;
	}

	/**
	 * Stop the observation: resolve high-cardinality attributes and notify handlers.
	 * Handlers are notified in reverse order (Micrometer convention).
	 */
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

	/**
	 * Notify handlers that a scope has been opened (forward order).
	 */
	notifyOnScopeOpened(): void {
		for (const handler of this._handlers) {
			handler.onScopeOpened?.(this._context);
		}
	}

	/**
	 * Notify handlers that a scope has been closed (reverse order).
	 */
	notifyOnScopeClosed(): void {
		for (let i = this._handlers.length - 1; i >= 0; i--) {
			this._handlers[i].onScopeClosed?.(this._context);
		}
	}

	/**
	 * Convenience method: start → open scope → execute fn → close scope → stop (with error handling).
	 */
	async observe<T>(fn: () => Promise<T>): Promise<T> {
		this.start();
		const scope = this.openScope();
		try {
			return await fn();
		} catch (err) {
			this.error(err instanceof Error ? err : new Error(String(err)));
			throw err;
		} finally {
			scope.close();
			this.stop();
		}
	}
}
