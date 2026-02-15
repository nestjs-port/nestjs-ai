import type { Observation } from "./observation";
import type { ObservationContext } from "./observation-context";
import type { ObservationConvention } from "./observation-convention.interface";
import type { ObservationRegistry } from "./observation-registry.interface";

/**
 * Documents an observation including its name and conventions.
 * Corresponds to Micrometer's ObservationDocumentation.
 *
 * Subclasses define static instances to emulate Java's enum pattern:
 *
 * @example
 * ```typescript
 * class ChatModelObservationDocumentation extends ObservationDocumentation {
 *   static readonly CHAT_MODEL_OPERATION = new ChatModelObservationDocumentation("gen_ai.chat", null);
 *
 *   constructor(name: string | null, contextualName: string | null) {
 *     super(name, contextualName);
 *   }
 * }
 *
 * ChatModelObservationDocumentation.CHAT_MODEL_OPERATION
 *   .observation(customConvention, defaultConvention, () => ctx, registry)
 *   .observe(async () => { ... });
 * ```
 */
export abstract class ObservationDocumentation {
	private readonly _name: string | null;
	private readonly _contextualName: string | null;

	protected constructor(
		name: string | null,
		contextualName: string | null = null,
	) {
		this._name = name;
		this._contextualName = contextualName;
	}

	/**
	 * Returns the technical name for the observation.
	 */
	getName(): string | null {
		return this._name;
	}

	/**
	 * Returns the contextual name for the observation.
	 */
	getContextualName(): string | null {
		return this._contextualName;
	}

	/**
	 * Creates an observation using this documentation's metadata.
	 *
	 * @param customConvention - Custom convention to override default (null to use default)
	 * @param defaultConvention - Default convention to use
	 * @param contextSupplier - Factory function to create the context
	 * @param registry - The observation registry
	 * @returns An Observation wrapping the context
	 */
	observation<CTX extends ObservationContext>(
		customConvention: ObservationConvention<CTX> | null,
		defaultConvention: ObservationConvention<CTX>,
		contextSupplier: () => CTX,
		registry: ObservationRegistry,
	): Observation<CTX> {
		return registry.observation(
			customConvention,
			defaultConvention,
			contextSupplier,
		);
	}
}
