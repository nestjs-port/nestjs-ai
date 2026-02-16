import type { Observation } from "./observation";
import type { ObservationContext } from "./observation-context";
import type { ObservationConvention } from "./observation-convention.interface";
import type { ObservationRegistry } from "./observation-registry.interface";
import { SimpleObservation } from "./simple-observation";

type ObservationConventionConstructor<
  CTX extends ObservationContext = ObservationContext,
> = abstract new (
  ...args: never[]
) => ObservationConvention<CTX>;

export abstract class ObservationDocumentation {
  /**
   * Returns the technical name for the observation.
   */
  get name(): string | null {
    return null;
  }

  /**
   * Returns the contextual name for the observation.
   */
  get contextualName(): string | null {
    return null;
  }

  get defaultConvention(): ObservationConventionConstructor | null {
    return null;
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
    const documentedDefaultConvention = this.defaultConvention;
    if (documentedDefaultConvention === null) {
      throw new Error(
        "You've decided to use convention based naming yet this observation [" +
          this.constructor.name +
          "] has not defined any default convention",
      );
    }

    const defaultConventionType =
      (defaultConvention as { constructor?: { name?: string } }).constructor
        ?.name ?? typeof defaultConvention;

    if (!(defaultConvention instanceof documentedDefaultConvention)) {
      throw new TypeError(
        "Observation [" +
          this.constructor.name +
          "] defined default convention to be of type [" +
          documentedDefaultConvention.name +
          "] but you have provided an incompatible one of type [" +
          defaultConventionType +
          "]",
      );
    }

    const observation = SimpleObservation.createNotStarted(
      customConvention,
      defaultConvention,
      contextSupplier,
      registry,
    );

    if (this.name != null) {
      observation.context.name = this.name;
    }

    if (this.contextualName != null) {
      observation.contextualName(this.contextualName);
    }

    return observation;
  }
}
