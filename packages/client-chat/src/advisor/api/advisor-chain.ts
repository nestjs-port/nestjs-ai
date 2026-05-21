import {
  NoopObservationRegistry,
  type ObservationRegistry,
} from "@nestjs-port/core";

/**
 * Defines the context for executing a chain of advisors as part of processing a chat
 * request.
 */
export abstract class AdvisorChain {
  get observationRegistry(): ObservationRegistry {
    return NoopObservationRegistry.INSTANCE;
  }
}
