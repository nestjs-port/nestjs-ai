import type { Milliseconds } from "../temporal";
import type { BackOff } from "./back-off.interface";
import { RetryPolicy } from "./retry-policy";
import { ExceptionTypeFilter } from "./support";

/**
 * Default {@link RetryPolicy} created by {@link RetryPolicyBuilder}.
 */
export class DefaultRetryPolicy extends RetryPolicy {
  private readonly exceptionTypeFilter: ExceptionTypeFilter;
  private readonly _backOff: BackOff;
  private readonly _timeout: Milliseconds;
  private readonly _predicate?: (throwable: unknown) => boolean;

  constructor(
    includes: Array<new (...args: never[]) => Error>,
    excludes: Array<new (...args: never[]) => Error>,
    predicate: ((throwable: unknown) => boolean) | undefined,
    timeout: Milliseconds,
    backOff: BackOff,
  ) {
    super();
    this.exceptionTypeFilter = new ExceptionTypeFilter(includes, excludes);
    this._backOff = backOff;
    this._timeout = timeout;
    this._predicate = predicate;
  }

  shouldRetry(throwable: Error): boolean {
    return (
      this.exceptionTypeFilter.match(throwable) &&
      (this._predicate == null || this._predicate(throwable))
    );
  }

  override get timeout(): Milliseconds {
    return this._timeout;
  }

  override get backOff(): BackOff {
    return this._backOff;
  }
}
