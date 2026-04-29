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

import type { MetaProvider } from "../context/index.js";

export type MetaProviderConstructor = new () => MetaProvider;

/**
 * Utility methods for working with `MetaProvider` metadata.
 *
 * This class instantiates the given provider type through a no-argument constructor
 * and returns its metadata as an immutable object.
 */
export abstract class MetaUtils {
  /** Not intended to be instantiated. */
  private constructor() {}

  /**
   * Instantiate the supplied `MetaProvider` type using a no-argument constructor
   * and return the metadata it supplies.
   *
   * The returned object is frozen to prevent external modification. If the provider
   * returns `null`, this method also returns `null`.
   */
  static getMeta(
    metaProviderClass: MetaProviderConstructor | null | undefined,
  ): Readonly<Record<string, unknown>> | null {
    if (metaProviderClass == null) {
      return null;
    }

    if (metaProviderClass.length > 0) {
      throw new Error(
        `Required no-arg constructor not found in ${metaProviderClass.name}`,
      );
    }

    try {
      const metaProvider = new metaProviderClass();
      const meta = metaProvider.getMeta();
      return meta == null ? null : Object.freeze({ ...meta });
    } catch (error) {
      throw new Error(`${metaProviderClass.name} instantiation failed`, {
        cause: error,
      });
    }
  }
}
