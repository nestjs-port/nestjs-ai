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

import { ParsingUtils } from "@nestjs-port/core";
import type { ToolDefinition } from "./tool-definition.js";

/**
 * Default implementation of {@link ToolDefinition}.
 */
export class DefaultToolDefinition implements ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: string;

  constructor(name: string, description: string, inputSchema: string) {
    if (!name || name.trim() === "") {
      throw new Error("name cannot be null or empty");
    }
    if (!description || description.trim() === "") {
      throw new Error("description cannot be null or empty");
    }
    if (!inputSchema || inputSchema.trim() === "") {
      throw new Error("inputSchema cannot be null or empty");
    }

    this.name = name;
    this.description = description;
    this.inputSchema = inputSchema;
  }

  static builder(): DefaultToolDefinitionBuilder {
    return new DefaultToolDefinitionBuilder();
  }
}

/**
 * Builder for creating {@link ToolDefinition} instances.
 */
export class DefaultToolDefinitionBuilder {
  private _name: string | null = null;
  private _description: string | null = null;
  private _inputSchema: string | null = null;

  name(name: string): this {
    this._name = name;
    return this;
  }

  description(description: string): this {
    this._description = description;
    return this;
  }

  inputSchema(inputSchema: string): this {
    this._inputSchema = inputSchema;
    return this;
  }

  build(): ToolDefinition {
    if (this._name == null || this._name.trim() === "") {
      throw new Error("toolName cannot be null or empty");
    }

    let description = this._description;
    if (!description || description.trim() === "") {
      description = ParsingUtils.reConcatenateCamelCase(this._name, " ");
    }

    if (!description || description.trim() === "") {
      throw new Error("toolDescription cannot be null or empty");
    }

    if (this._inputSchema == null || this._inputSchema.trim() === "") {
      throw new Error("inputSchema cannot be null or empty");
    }

    return new DefaultToolDefinition(
      this._name,
      description,
      this._inputSchema,
    );
  }
}
