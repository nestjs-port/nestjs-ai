import type { ObservationContext } from "./observation-context";
import type { ObservationHandler } from "./observation-handler.interface";

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
