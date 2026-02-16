import type { Milliseconds } from "@nestjs-ai/commons";
import { ms } from "@nestjs-ai/commons";
import type { RateLimit } from "./rate-limit";

/**
 * A RateLimit implementation that returns zero for all property getters.
 */
export class EmptyRateLimit implements RateLimit {
  get requestsLimit(): number {
    return 0;
  }

  get requestsRemaining(): number {
    return 0;
  }

  get requestsReset(): Milliseconds {
    return ms(0);
  }

  get tokensLimit(): number {
    return 0;
  }

  get tokensRemaining(): number {
    return 0;
  }

  get tokensReset(): Milliseconds {
    return ms(0);
  }
}
