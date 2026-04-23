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

import type { Media, TemplateRenderer } from "@nestjs-ai/commons";
import type { Message } from "../messages/index.js";
import { SystemMessage } from "../messages/index.js";
import type { ChatOptions } from "./chat-options.interface.js";
import { Prompt } from "./prompt.js";
import { PromptTemplate, PromptTemplateBuilder } from "./prompt-template.js";

export class SystemPromptTemplate extends PromptTemplate {
  constructor(template: string);
  constructor(resource: Buffer);
  constructor(
    template: string,
    variables: Record<string, unknown>,
    renderer: TemplateRenderer,
  );
  constructor(
    resource: Buffer,
    variables: Record<string, unknown>,
    renderer: TemplateRenderer,
  );
  constructor(
    templateOrResource: string | Buffer,
    variables?: Record<string, unknown>,
    renderer?: TemplateRenderer,
  ) {
    if (variables !== undefined && renderer !== undefined) {
      super(templateOrResource as string, variables, renderer);
    } else {
      super(templateOrResource as string);
    }
  }

  override createMessage(): Message;
  override createMessage(mediaList: Media[]): Message;
  override createMessage(model: Record<string, unknown>): Message;
  override createMessage(
    mediaListOrModel?: Media[] | Record<string, unknown>,
  ): Message {
    if (mediaListOrModel == null) {
      return SystemMessage.of(this.render());
    }
    // Media[] case — delegate to parent (UserMessage-based)
    if (Array.isArray(mediaListOrModel)) {
      return super.createMessage(mediaListOrModel);
    }
    return SystemMessage.of(this.render(mediaListOrModel));
  }

  override create(): Prompt;
  override create(modelOptions: ChatOptions): Prompt;
  override create(model: Record<string, unknown>): Prompt;
  override create(
    model: Record<string, unknown>,
    modelOptions: ChatOptions,
  ): Prompt;
  override create(
    modelOrOptions?: Record<string, unknown> | ChatOptions,
    modelOptions?: ChatOptions,
  ): Prompt {
    // create()
    if (modelOrOptions == null && modelOptions == null) {
      return new Prompt(new SystemMessage({ content: this.render() }));
    }
    // create(model, modelOptions) — delegate to parent
    if (modelOrOptions != null && modelOptions != null) {
      return super.create(
        modelOrOptions as Record<string, unknown>,
        modelOptions,
      );
    }
    // create(ChatOptions) — delegate to parent
    if (modelOrOptions != null && this.isChatOptions(modelOrOptions)) {
      return super.create(modelOrOptions);
    }
    // create(model)
    return new Prompt(
      new SystemMessage({
        content: this.render(modelOrOptions as Record<string, unknown>),
      }),
    );
  }

  static override builder(): SystemPromptTemplateBuilder {
    return new SystemPromptTemplateBuilder();
  }
}

export class SystemPromptTemplateBuilder extends PromptTemplateBuilder {
  override template(template: string): SystemPromptTemplateBuilder {
    super.template(template);
    return this;
  }

  override resource(resource: Buffer): SystemPromptTemplateBuilder {
    super.resource(resource);
    return this;
  }

  override variables(
    variables: Record<string, unknown>,
  ): SystemPromptTemplateBuilder {
    super.variables(variables);
    return this;
  }

  override renderer(renderer: TemplateRenderer): SystemPromptTemplateBuilder {
    super.renderer(renderer);
    return this;
  }

  override build(): SystemPromptTemplate {
    if (this._template != null && this._resource != null) {
      throw new Error("Only one of template or resource can be set");
    }
    if (this._resource != null) {
      return new SystemPromptTemplate(
        this._resource,
        this._variables,
        this._renderer,
      );
    }
    if (this._template != null) {
      return new SystemPromptTemplate(
        this._template,
        this._variables,
        this._renderer,
      );
    }
    throw new Error("Neither template nor resource is set");
  }
}
