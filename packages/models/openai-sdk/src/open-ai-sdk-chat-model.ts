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
 * Placeholder for the OpenAI SDK-based chat model implementation.
 *
 * The concrete OpenAI Java SDK integration can be added here without changing the
 * package structure or workspace wiring.
 */
export class OpenAiSdkChatModel {}

export namespace OpenAiSdkChatModel {
  export class ResponseFormat {
    private _type: ResponseFormat.Type = ResponseFormat.Type.TEXT;
    private _jsonSchema: string | null = null;

    get type(): ResponseFormat.Type {
      return this._type;
    }

    set type(type: ResponseFormat.Type) {
      this._type = type;
    }

    get jsonSchema(): string | null {
      return this._jsonSchema;
    }

    set jsonSchema(jsonSchema: string | null) {
      this._jsonSchema = jsonSchema;
    }

    static builder(): ResponseFormat.Builder {
      return new ResponseFormat.Builder();
    }
  }

  export namespace ResponseFormat {
    export enum Type {
      TEXT = "TEXT",
      JSON_OBJECT = "JSON_OBJECT",
      JSON_SCHEMA = "JSON_SCHEMA",
    }

    export class Builder {
      private readonly responseFormat = new ResponseFormat();

      type(type: Type): this {
        this.responseFormat.type = type;
        return this;
      }

      jsonSchema(jsonSchema: string): this {
        this.responseFormat.type = Type.JSON_SCHEMA;
        this.responseFormat.jsonSchema = jsonSchema;
        return this;
      }

      build(): ResponseFormat {
        return this.responseFormat;
      }
    }
  }
}
