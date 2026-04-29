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

import { describe, expect, it } from "vitest";
import { MetaUtils } from "../index.js";

class MetaProviderWithDefaultConstructor {
  getMeta() {
    return { a: "1", b: "2" };
  }
}

class MetaProviderWithAvailableConstructor {
  /** Nothing to do here */
  constructor() {}

  getMeta() {
    return { a: "1", b: "2" };
  }
}

class MetaProviderWithUnavailableConstructor {
  /** Nothing to do here */
  constructor() {
    throw new Error("Nothing to do here");
  }

  getMeta() {
    return { a: "1", b: "2" };
  }
}

class MetaProviderWithConstructorWithWrongSignature {
  /** Nothing to do here */
  constructor(_invalid: number) {
    void _invalid;
  }

  getMeta() {
    return { a: "1", b: "2" };
  }
}

class DefaultMetaProvider {
  getMeta() {
    return null;
  }
}

describe("MetaUtils", () => {
  it("test get meta non null", () => {
    const actual = MetaUtils.getMeta(MetaProviderWithDefaultConstructor);

    expect(actual).toStrictEqual(
      new MetaProviderWithDefaultConstructor().getMeta(),
    );
  });

  it("test get meta with public constructor", () => {
    const actual = MetaUtils.getMeta(MetaProviderWithAvailableConstructor);

    expect(actual).toStrictEqual(
      new MetaProviderWithAvailableConstructor().getMeta(),
    );
  });

  it("test get meta with unavailable constructor", () => {
    expect(() =>
      MetaUtils.getMeta(MetaProviderWithUnavailableConstructor),
    ).toThrowError(
      "MetaProviderWithUnavailableConstructor instantiation failed",
    );
  });

  it("test get meta with constructor with wrong signature", () => {
    expect(() =>
      MetaUtils.getMeta(
        MetaProviderWithConstructorWithWrongSignature as unknown as new () => {
          getMeta(): Record<string, unknown> | null;
        },
      ),
    ).toThrowError(
      "Required no-arg constructor not found in MetaProviderWithConstructorWithWrongSignature",
    );
  });

  it("test get meta null", () => {
    const actual = MetaUtils.getMeta(DefaultMetaProvider);

    expect(actual).toBeNull();
  });

  it("test meta provider class is null returns null", () => {
    const actual = MetaUtils.getMeta(null);

    expect(actual).toBeNull();
  });
});
