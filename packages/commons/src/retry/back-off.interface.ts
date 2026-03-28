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

/**
 * Strategy interface for providing a {@link BackOffExecution} that indicates the
 * rate at which an operation should be retried.
 *
 * Users of this interface are expected to use it like this:
 *
 * ```ts
 * BackOffExecution execution = backOff.start();
 *
 * // In the operation recovery/retry loop:
 * const waitInterval = execution.nextBackOff();
 * if (waitInterval == BackOffExecution.STOP) {
 *     // do not retry operation
 * }
 * else {
 *     // sleep, for example, Thread.sleep(waitInterval)
 *     // retry operation
 * }
 * ```
 *
 * Once the underlying operation has completed successfully, the execution
 * instance can be discarded.
 *
 * @see BackOffExecution
 * @see FixedBackOff
 * @see ExponentialBackOff
 */
export interface BackOff {
  /**
   * Start a new back off execution.
   * @return a fresh {@link BackOffExecution} ready to be used
   */
  start(): BackOffExecution;
}

/**
 * <p>A {@link BackOffExecution} is effectively an executable instance of a given
 * {@link BackOff} strategy.
 *
 * @see BackOff
 */
export abstract class BackOffExecution {
  /**
   * Return value of {@link #nextBackOff()} which indicates that the operation
   * should not be retried.
   */
  static STOP = -1 as Milliseconds;

  /**
   * Return the number of milliseconds to wait before retrying the operation
   * or {@link #STOP} ({@value #STOP}) to indicate that no further attempt
   * should be made for the operation.
   */
  abstract nextBackOff(): Milliseconds;
}
