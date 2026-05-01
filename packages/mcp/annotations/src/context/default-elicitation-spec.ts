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

import type { ElicitationSpec } from "./mcp-request-context-types.js";

export class DefaultElicitationSpec implements ElicitationSpec {
  _message?: string;

  _meta: Record<string, unknown> = {};

  message(message: string): ElicitationSpec {
    this._message = message;
    return this;
  }

  meta(m: Record<string, unknown>): ElicitationSpec;
  meta(k: string, v: unknown): ElicitationSpec;
  meta(mOrKey: Record<string, unknown> | string, v?: unknown): ElicitationSpec {
    if (typeof mOrKey === "string") {
      if (mOrKey != null && v != null) {
        this._meta[mOrKey] = v;
      }
    } else if (mOrKey != null) {
      Object.assign(this._meta, mOrKey);
    }
    return this;
  }
}
