/*
 * Copyright 2023-present the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
