import type { ObservationContext } from "./observation-context";
import type { ObservationConvention } from "./observation-convention.interface";
import type { ObservationHandler } from "./observation-handler.interface";

/**
 * Lifecycle wrapper around an observation context.
 * Manages the start → [error] → stop flow and delegates to handlers.
 * Corresponds to Micrometer's Observation.
 */
export class Observation<CTX extends ObservationContext> {
	private readonly _context: CTX;
	private readonly _convention: ObservationConvention<CTX>;
	private readonly _handlers: ObservationHandler<CTX>[];

	constructor(
		context: CTX,
		convention: ObservationConvention<CTX>,
		handlers: ObservationHandler<CTX>[],
	) {
		this._context = context;
		this._convention = convention;
		this._handlers = handlers;
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
	 */
	stop(): void {
		for (const kv of this._convention.getHighCardinalityKeyValues(
			this._context,
		)) {
			this._context.addHighCardinalityKeyValue(kv.key, kv.value);
		}

		for (const handler of this._handlers) {
			handler.onStop?.(this._context);
		}
	}

	/**
	 * Convenience method: start → execute fn → stop (with error handling).
	 */
	async observe<T>(fn: () => Promise<T>): Promise<T> {
		this.start();
		try {
			const result = await fn();
			this.stop();
			return result;
		} catch (err) {
			this.error(err instanceof Error ? err : new Error(String(err)));
			this.stop();
			throw err;
		}
	}
}
