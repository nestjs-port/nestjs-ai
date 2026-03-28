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

/**
 * Root of the hierarchy of Model access exceptions that are considered transient - where
 * a previously failed operation might be able to succeed when the operation is retried
 * without any intervention.
 */
export class TransientAiException extends Error {
  /**
   * Constructor with message.
   * @param message the exception message
   */
  constructor(message: string);

  /**
   * Constructor with message and cause.
   * @param message the exception message
   * @param cause the exception cause
   */
  constructor(message: string, cause: Error | undefined);

  constructor(message: string, cause?: Error) {
    super(message, cause ? { cause } : undefined);
    this.name = "TransientAiException";

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TransientAiException);
    }
  }
}
