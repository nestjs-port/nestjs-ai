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

import type { StructuredOutputConverter } from "./structured-output-converter";

export class ListOutputConverter implements StructuredOutputConverter<
  string[]
> {
  get format(): string {
    return `Respond with only a list of comma-separated values, without any leading or trailing text.
Example format: foo, bar, baz`;
  }

  convert(source: string): string[] {
    if (source.length === 0) {
      return [];
    }
    return source.split(",").map((value) => value.trim());
  }
}
