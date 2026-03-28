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

import assert from "node:assert/strict";
import {
  type Logger,
  LoggerFactory,
  type Media,
  type TemplateRenderer,
} from "@nestjs-ai/commons";
import { StTemplateRenderer } from "@nestjs-ai/template-st";
import type { Message } from "../messages";
import { UserMessage } from "../messages";
import type { ChatOptions } from "./chat-options.interface";
import { Prompt } from "./prompt";
import type { PromptTemplateActions } from "./prompt-template-actions.interface";
import type { PromptTemplateMessageActions } from "./prompt-template-message-actions.interface";

const DEFAULT_TEMPLATE_RENDERER: TemplateRenderer = new StTemplateRenderer();

export class PromptTemplate
  implements PromptTemplateActions, PromptTemplateMessageActions
{
  private readonly _log: Logger = LoggerFactory.getLogger(PromptTemplate.name);

  private readonly _template: string;

  private readonly _variables: Record<string, unknown>;

  private readonly _renderer: TemplateRenderer;

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
    variables: Record<string, unknown> = {},
    renderer: TemplateRenderer = DEFAULT_TEMPLATE_RENDERER,
  ) {
    assert(variables != null, "variables cannot be null");
    for (const key of Object.keys(variables)) {
      assert(key != null, "variables keys cannot be null");
    }
    assert(renderer != null, "renderer cannot be null");

    if (Buffer.isBuffer(templateOrResource)) {
      assert(templateOrResource != null, "resource cannot be null");
      const template = templateOrResource.toString("utf-8");
      assert(
        template != null && template.length > 0,
        "template cannot be null or empty",
      );
      this._template = template;
    } else {
      assert(
        templateOrResource != null && templateOrResource.trim().length > 0,
        "template cannot be null or empty",
      );
      this._template = templateOrResource;
    }

    this._variables = { ...variables };
    this._renderer = renderer;
  }

  add(name: string, value: unknown): void {
    this._variables[name] = value;
  }

  get template(): string {
    return this._template;
  }

  // PromptTemplateStringActions

  render(): string;
  render(additionalVariables: Record<string, unknown>): string;
  render(additionalVariables?: Record<string, unknown>): string {
    if (
      additionalVariables != null &&
      Object.keys(additionalVariables).length > 0
    ) {
      const mergedVariables: Record<string, unknown> = {
        ...this._variables,
        ...additionalVariables,
      };
      const combinedVariables = this.processVariables(mergedVariables);
      return this._renderer.apply(this._template, combinedVariables);
    }

    const processedVariables = this.processVariables(this._variables);
    return this._renderer.apply(this._template, processedVariables);
  }

  private processVariables(
    variables: Record<string, unknown>,
  ): Record<string, unknown | null> {
    const processed: Record<string, unknown | null> = {};
    for (const [key, value] of Object.entries(variables)) {
      if (Buffer.isBuffer(value)) {
        processed[key] = this.renderResource(value);
      } else {
        processed[key] = value;
      }
    }
    return processed;
  }

  private renderResource(resource: Buffer): string {
    if (resource == null) {
      return "";
    }
    try {
      if (resource.length === 0) {
        return "";
      }
      return resource.toString("utf-8");
    } catch (e) {
      this._log.warn("Failed to render resource", e);
      return "[Unable to render resource]";
    }
  }

  // PromptTemplateMessageActions

  createMessage(): Message;
  createMessage(mediaList: Media[]): Message;
  createMessage(model: Record<string, unknown>): Message;
  createMessage(mediaListOrModel?: Media[] | Record<string, unknown>): Message {
    if (mediaListOrModel == null) {
      return UserMessage.of(this.render());
    }
    if (Array.isArray(mediaListOrModel)) {
      return new UserMessage({
        content: this.render(),
        media: mediaListOrModel,
      });
    }
    return UserMessage.of(this.render(mediaListOrModel));
  }

  // PromptTemplateActions

  create(): Prompt;
  create(modelOptions: ChatOptions): Prompt;
  create(model: Record<string, unknown>): Prompt;
  create(model: Record<string, unknown>, modelOptions: ChatOptions): Prompt;
  create(
    modelOrOptions?: Record<string, unknown> | ChatOptions,
    modelOptions?: ChatOptions,
  ): Prompt {
    // create()
    if (modelOrOptions == null && modelOptions == null) {
      return new Prompt(this.render({}));
    }
    // create(model, modelOptions)
    if (modelOrOptions != null && modelOptions != null) {
      return Prompt.builder()
        .content(this.render(modelOrOptions as Record<string, unknown>))
        .chatOptions(modelOptions)
        .build();
    }
    // create(ChatOptions) - has chatOptions-like shape (not a plain variables map)
    if (modelOrOptions != null && this.isChatOptions(modelOrOptions)) {
      return Prompt.builder()
        .content(this.render({}))
        .chatOptions(modelOrOptions as ChatOptions)
        .build();
    }
    // create(model)
    return new Prompt(this.render(modelOrOptions as Record<string, unknown>));
  }

  protected isChatOptions(obj: unknown): obj is ChatOptions {
    if (obj == null || typeof obj !== "object") {
      return false;
    }
    return "copy" in obj;
  }

  mutate(): PromptTemplateBuilder {
    return new PromptTemplateBuilder()
      .template(this._template)
      .variables({ ...this._variables })
      .renderer(this._renderer);
  }

  static builder(): PromptTemplateBuilder {
    return new PromptTemplateBuilder();
  }
}

export class PromptTemplateBuilder {
  protected _template: string | null = null;

  protected _resource: Buffer | null = null;

  protected _variables: Record<string, unknown> = {};

  protected _renderer: TemplateRenderer = DEFAULT_TEMPLATE_RENDERER;

  template(template: string): PromptTemplateBuilder {
    assert(
      template != null && template.trim().length > 0,
      "template cannot be null or empty",
    );
    this._template = template;
    return this;
  }

  resource(resource: Buffer): PromptTemplateBuilder {
    assert(resource != null, "resource cannot be null");
    this._resource = resource;
    return this;
  }

  variables(variables: Record<string, unknown>): PromptTemplateBuilder {
    assert(variables != null, "variables cannot be null");
    for (const key of Object.keys(variables)) {
      assert(key != null, "variables keys cannot be null");
    }
    this._variables = variables;
    return this;
  }

  renderer(renderer: TemplateRenderer): PromptTemplateBuilder {
    assert(renderer != null, "renderer cannot be null");
    this._renderer = renderer;
    return this;
  }

  build(): PromptTemplate {
    if (this._template != null && this._resource != null) {
      throw new Error("Only one of template or resource can be set");
    }
    if (this._resource != null) {
      return new PromptTemplate(
        this._resource,
        this._variables,
        this._renderer,
      );
    }
    if (this._template != null) {
      return new PromptTemplate(
        this._template,
        this._variables,
        this._renderer,
      );
    }
    throw new Error("Neither template nor resource is set");
  }
}
