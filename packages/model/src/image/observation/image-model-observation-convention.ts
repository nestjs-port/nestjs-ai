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

import type {
  KeyValues,
  ObservationContext,
  ObservationConvention,
} from "@nestjs-port/core";

import { ImageModelObservationContext } from "./image-model-observation-context";

export abstract class ImageModelObservationConvention
  implements ObservationConvention<ImageModelObservationContext>
{
  abstract getName(): string;

  abstract getContextualName(context: ImageModelObservationContext): string;

  supportsContext(
    context: ObservationContext,
  ): context is ImageModelObservationContext {
    return context instanceof ImageModelObservationContext;
  }

  abstract getLowCardinalityKeyValues(
    context: ImageModelObservationContext,
  ): KeyValues;

  abstract getHighCardinalityKeyValues(
    context: ImageModelObservationContext,
  ): KeyValues;
}
