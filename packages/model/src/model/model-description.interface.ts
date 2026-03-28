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
 * Describes an AI model's basic characteristics. Provides methods to retrieve the model's
 * name, description, and version.
 */
export interface ModelDescription {
  /**
   * Returns the name of the model.
   * @returns the name of the model
   */
  get name(): string;

  /**
   * Returns the description of the model.
   * @returns the description of the model
   */
  get description(): string;

  /**
   * Returns the version of the model.
   * @returns the version of the model
   */
  get version(): string;
}
