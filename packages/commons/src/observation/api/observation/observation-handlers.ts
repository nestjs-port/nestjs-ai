import type { ObservationContext } from "./observation-context";
import type { ObservationHandler } from "./observation-handler.interface";

/**
 * Mutable container for observation handlers.
 */
export class ObservationHandlers {
  private readonly _handlers: ObservationHandler<ObservationContext>[];

  constructor(
    handlers: readonly ObservationHandler<ObservationContext>[] = [],
  ) {
    this._handlers = [...handlers];
  }

  get handlers(): readonly ObservationHandler<ObservationContext>[] {
    return this._handlers;
  }

  addHandler(handler: ObservationHandler<ObservationContext>): void {
    this._handlers.push(handler);
  }

  addHandlers(
    handlers: readonly ObservationHandler<ObservationContext>[],
  ): void {
    this._handlers.push(...handlers);
  }
}
