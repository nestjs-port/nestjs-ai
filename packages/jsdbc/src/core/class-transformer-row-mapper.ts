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

import {
  type ClassConstructor,
  type ClassTransformOptions,
  plainToInstance,
} from "class-transformer";

import type { RowMapper } from "./row-mapper.interface";

export class ClassTransformerRowMapper<T extends object>
  implements RowMapper<T>
{
  constructor(
    private readonly targetType: ClassConstructor<T>,
    private readonly options?: ClassTransformOptions,
  ) {}

  mapRow(row: Record<string, unknown>, _rowNum: number): T {
    return plainToInstance(this.targetType, row, this.options);
  }
}
