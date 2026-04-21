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
import assert from "node:assert/strict";
import type { ToolAnnotationMetadata } from "../annotation";
import { TOOL_METADATA_KEY } from "../annotation";
import { ToolMetadata } from "../metadata";
import { ToolDefinitions, ToolUtils } from "../support";
import type { ToolCallback } from "../tool-callback";
import type { ToolCallbackProvider } from "../tool-callback-provider";
import { MethodToolCallback } from "./method-tool-callback";

interface ToolMethodDescriptor {
  metadataTarget: object;
  propertyKey: string | symbol;
  toolMethod: (...args: never[]) => unknown | Promise<unknown>;
  toolObject: ToolObjectInstance;
}

export type ToolObjectInstance<T extends object = object> = T extends (
  ...args: never[]
) => unknown
  ? never
  : T extends abstract new (...args: never[]) => unknown
    ? never
    : T;

/**
 * A {@link ToolCallbackProvider} that builds {@link ToolCallback} instances from
 * {@link Tool}-annotated methods.
 */
export class MethodToolCallbackProvider implements ToolCallbackProvider {
  private readonly _toolObjects: ToolObjectInstance[];

  constructor(toolObjects: ToolObjectInstance[]) {
    assert(toolObjects, "toolObjects cannot be null");
    assert(
      toolObjects.every((toolObject) => toolObject != null),
      "toolObjects cannot contain null elements",
    );
    assert(
      toolObjects.every((toolObject) => typeof toolObject !== "function"),
      "toolObjects must contain class instances only",
    );

    this.assertToolAnnotatedMethodsPresent(toolObjects);
    this._toolObjects = toolObjects;
    this.validateToolCallbacks(this.toolCallbacks);
  }

  get toolCallbacks(): ToolCallback[] {
    const callbacks = this._toolObjects.flatMap((toolObject) =>
      this.findToolMethods(toolObject).map((toolMethodDescriptor) =>
        this.toMethodToolCallback(toolMethodDescriptor),
      ),
    );

    this.validateToolCallbacks(callbacks);
    return callbacks;
  }

  private toMethodToolCallback({
    metadataTarget,
    propertyKey,
    toolMethod,
    toolObject,
  }: ToolMethodDescriptor): MethodToolCallback {
    const metadata = Reflect.getMetadata(
      TOOL_METADATA_KEY,
      metadataTarget,
      propertyKey,
    ) as ToolAnnotationMetadata;

    return MethodToolCallback.builder()
      .toolDefinition(
        ToolDefinitions.from({
          methodName:
            typeof propertyKey === "string" ? propertyKey : String(propertyKey),
          metadata,
        }),
      )
      .toolMetadata(
        ToolMetadata.create({ returnDirect: metadata.returnDirect }),
      )
      .toolMethod(toolMethod)
      .toolObject(toolObject)
      .toolInputSchema(metadata.parameters ?? null)
      .toolCallResultConverter(
        ToolUtils.getToolCallResultConverter(metadataTarget, propertyKey),
      )
      .build();
  }

  private assertToolAnnotatedMethodsPresent(
    toolObjects: ToolObjectInstance[],
  ): void {
    for (const toolObject of toolObjects) {
      if (this.findToolMethods(toolObject).length === 0) {
        const source = this.describeToolObject(toolObject);
        throw new Error(
          `No @Tool annotated methods found in ${source}.` +
            "Did you mean to pass a ToolCallback or ToolCallbackProvider? If so, you have to use .toolCallbacks() instead of .tool()",
        );
      }
    }
  }

  private findToolMethods(
    toolObject: ToolObjectInstance,
  ): ToolMethodDescriptor[] {
    return [
      ...this.findInstanceToolMethods(toolObject),
      ...this.findStaticToolMethods(toolObject),
    ];
  }

  private findInstanceToolMethods(
    toolObject: ToolObjectInstance,
  ): ToolMethodDescriptor[] {
    const prototype = Object.getPrototypeOf(toolObject);
    if (!prototype || prototype === Object.prototype) {
      return [];
    }

    return this.extractToolMethods(prototype, toolObject);
  }

  private findStaticToolMethods(
    toolObject: ToolObjectInstance,
  ): ToolMethodDescriptor[] {
    const constructorTarget = (toolObject as { constructor?: object })
      .constructor;
    if (!constructorTarget || constructorTarget === Function) {
      return [];
    }

    return this.extractToolMethods(constructorTarget, constructorTarget);
  }

  private extractToolMethods(
    metadataTarget: object,
    invocationTarget: object,
  ): ToolMethodDescriptor[] {
    const toolMethods: ToolMethodDescriptor[] = [];

    for (const propertyKey of Reflect.ownKeys(metadataTarget)) {
      if (propertyKey === "constructor") {
        continue;
      }

      if (
        !Reflect.hasOwnMetadata(TOOL_METADATA_KEY, metadataTarget, propertyKey)
      ) {
        continue;
      }

      const toolMethod = (invocationTarget as Record<PropertyKey, unknown>)[
        propertyKey as PropertyKey
      ] as (...args: never[]) => unknown | Promise<unknown>;

      toolMethods.push({
        metadataTarget,
        propertyKey,
        toolMethod,
        toolObject: invocationTarget,
      });
    }

    return toolMethods;
  }

  private validateToolCallbacks(toolCallbacks: ToolCallback[]): void {
    const duplicateToolNames = ToolUtils.getDuplicateToolNames(toolCallbacks);
    if (duplicateToolNames.length > 0) {
      const sources = this._toolObjects
        .map((toolObject) => this.describeToolObject(toolObject))
        .join(", ");
      throw new Error(
        `Multiple tools with the same name (${duplicateToolNames.join(", ")}) found in sources: ${sources}`,
      );
    }
  }

  private describeToolObject(toolObject: ToolObjectInstance): string {
    const constructorName = (toolObject as { constructor?: { name?: string } })
      .constructor?.name;
    return constructorName && constructorName.length > 0
      ? constructorName
      : toolObject.toString();
  }
}
