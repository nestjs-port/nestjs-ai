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

import { SCHEMA_FIELD_TYPE } from "@redis/search";

export const RedisMetadataFieldType = SCHEMA_FIELD_TYPE;
export type RedisMetadataFieldType =
  (typeof RedisMetadataFieldType)[keyof typeof RedisMetadataFieldType];

export class RedisMetadataField {
  private constructor(
    public readonly name: string,
    public readonly fieldType: RedisMetadataFieldType,
  ) {}

  static text(name: string): RedisMetadataField {
    return new RedisMetadataField(name, SCHEMA_FIELD_TYPE.TEXT);
  }

  static numeric(name: string): RedisMetadataField {
    return new RedisMetadataField(name, SCHEMA_FIELD_TYPE.NUMERIC);
  }

  static tag(name: string): RedisMetadataField {
    return new RedisMetadataField(name, SCHEMA_FIELD_TYPE.TAG);
  }
}
