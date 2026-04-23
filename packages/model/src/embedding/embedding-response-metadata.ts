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

import { EmptyUsage, type Usage } from "../chat/index.js";
import {
  AbstractResponseMetadata,
  type ResponseMetadata,
} from "../model/index.js";

/**
 * Common AI provider metadata returned in an embedding response.
 */
export class EmbeddingResponseMetadata
  extends AbstractResponseMetadata
  implements ResponseMetadata
{
  protected _model: string = "";
  protected _usage: Usage = new EmptyUsage();

  constructor(
    model: string = "",
    usage: Usage = new EmptyUsage(),
    metadata: Record<string, unknown> = {},
  ) {
    super();
    this._model = model;
    this._usage = usage;

    for (const [key, value] of Object.entries(metadata)) {
      this.map.set(key, value);
    }
  }

  /**
   * The model that handled the request.
   */
  get model(): string {
    return this._model;
  }

  setModel(model: string): void {
    this._model = model;
  }

  /**
   * The AI provider specific metadata on API usage.
   */
  get usage(): Usage {
    return this._usage;
  }

  setUsage(usage: Usage): void {
    this._usage = usage;
  }
}
