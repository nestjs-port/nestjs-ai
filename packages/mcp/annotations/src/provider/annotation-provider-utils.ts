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

import "reflect-metadata";

export function discoverAnnotatedMethodKeys(
  bean: object,
  metadataKey: symbol,
): (string | symbol)[] {
  const prototype = Object.getPrototypeOf(bean) as object;
  return Object.getOwnPropertyNames(prototype)
    .filter((name) => name !== "constructor")
    .filter(
      (name) => typeof (bean as Record<string, unknown>)[name] === "function",
    )
    .filter((name) => Reflect.getMetadata(metadataKey, prototype, name) != null)
    .sort((a, b) => a.localeCompare(b));
}

export function getAnnotatedMethodMetadata<T>(
  bean: object,
  propertyKey: string | symbol,
  metadataKey: symbol,
): T | null {
  return (
    (Reflect.getMetadata(
      metadataKey,
      Object.getPrototypeOf(bean),
      propertyKey,
    ) as T | undefined) ?? null
  );
}
