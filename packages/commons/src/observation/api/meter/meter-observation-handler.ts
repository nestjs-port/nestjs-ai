import type { ObservationContext, ObservationHandler } from "../observation";

/**
 * Marker base class for meter handlers.
 */
export abstract class MeterObservationHandler<CTX extends ObservationContext>
  implements ObservationHandler<CTX>
{
  supportsContext(_context: ObservationContext): _context is CTX {
    return true;
  }
}
