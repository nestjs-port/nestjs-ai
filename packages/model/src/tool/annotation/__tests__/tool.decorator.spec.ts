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

import { Readable } from "node:stream";
import { assert, describe, expect, it } from "vitest";
import { z } from "zod";
import { ToolContext, ToolContextSchema } from "../../../chat/index.js";
import {
  TOOL_V2_METADATA_KEY,
  ToolV2,
  type ToolV2AnnotationMetadata,
} from "../index.js";

class ToolOverloadExamples {
  @ToolV2()
  noArgsAndVoidReturn() {}

  // @ts-expect-error schema-less @ToolV2() only supports `() => void | Promise<void>`
  @ToolV2()
  hasInputWithoutSchema(_value: string) {}

  // @ts-expect-error schema-less @ToolV2() only supports `() => void | Promise<void>`
  @ToolV2()
  hasReturnWithoutSchema() {
    return "value";
  }

  @ToolV2({
    parameters: z.object({ value: z.string() }),
  })
  onlyParametersSchema(input: { value: string }) {
    void input.value;
  }

  @ToolV2({
    parameters: z.object({ value: z.string() }),
  })
  async onlyParametersSchemaAsync(input: { value: string }) {
    void input.value;
  }

  @ToolV2({
    returns: z.string(),
  })
  onlyReturnsSchema() {
    return "value";
  }

  // @ts-expect-error returns-only @ToolV2({ returns }) requires a zero-argument method
  @ToolV2({
    returns: z.string(),
  })
  onlyReturnsSchemaWithInput(_value: string) {
    return "value";
  }
}
void ToolOverloadExamples;

class TypedToolExamples {
  @ToolV2({
    parameters: z.object({ city: z.string() }),
    returns: z.object({ temperature: z.number() }),
  })
  valid(_input: { city: string }) {
    return { temperature: 20 };
  }

  // @ts-expect-error input type must match the `parameters` schema type
  @ToolV2({
    parameters: z.object({ city: z.string() }),
    returns: z.object({ temperature: z.number() }),
  })
  invalidInput(_input: { city: number }) {
    return { temperature: 20 };
  }

  // @ts-expect-error return type must match the `returns` schema type
  @ToolV2({
    parameters: z.object({ city: z.string() }),
    returns: z.object({ temperature: z.number() }),
  })
  invalidReturn(_input: { city: string }) {
    return { temperature: "20" };
  }
}
void TypedToolExamples;

class AdvancedTypedToolExamples {
  @ToolV2({
    parameters: z.object({ value: z.string() }),
    returns: z.instanceof(Buffer),
  })
  bufferReturn(input: { value: string }) {
    return Buffer.from(input.value);
  }

  // @ts-expect-error return type must be Buffer
  @ToolV2({
    parameters: z.object({ value: z.string() }),
    returns: z.instanceof(Buffer),
  })
  invalidBufferReturn(input: { value: string }) {
    return input.value;
  }

  @ToolV2({
    parameters: z.object({ value: z.string() }),
    returns: z.instanceof(Readable),
  })
  streamReturn(input: { value: string }) {
    return Readable.from([input.value]);
  }

  // @ts-expect-error return type must be Readable
  @ToolV2({
    parameters: z.object({ value: z.string() }),
    returns: z.instanceof(Readable),
  })
  invalidStreamReturn(input: { value: string }) {
    return Buffer.from(input.value);
  }

  @ToolV2({
    parameters: z.object({ city: z.string().optional() }),
    returns: z.boolean(),
  })
  optionalFieldInSchema(input: { city?: string }) {
    return Boolean(input.city);
  }

  // @ts-expect-error optional method parameter does not match required schema input
  @ToolV2({
    parameters: z.object({ city: z.string() }),
    returns: z.boolean(),
  })
  optionalMethodArgWithRequiredSchema(input?: { city: string }) {
    return Boolean(input?.city);
  }

  // @ts-expect-error required method input does not match optional schema input
  @ToolV2({
    parameters: z.object({ city: z.string().optional() }),
    returns: z.boolean(),
  })
  requiredMethodArgWithOptionalSchema(input: { city: string }) {
    return Boolean(input.city);
  }
}
void AdvancedTypedToolExamples;

class ToolContextTypedExamples {
  @ToolV2()
  validToolContextAsFirstArg(context: ToolContext) {
    void context.context;
  }

  @ToolV2({
    parameters: z.object({ city: z.string() }),
    returns: z.string(),
  })
  validToolContextAsSecondArg(input: { city: string }, context: ToolContext) {
    return `${input.city}:${JSON.stringify(context?.context ?? {})}`;
  }
}
void ToolContextTypedExamples;

describe("ToolDecorator", () => {
  class TestTools {
    @ToolV2({
      name: "getWeather",
      parameters: z.object({ city: z.string() }),
      returns: z.object({ temperature: z.number() }),
    })
    getWeather(input: { city: string }) {
      return { temperature: input.city.length };
    }
  }

  it("stores zod parameter and return schemas in metadata", async () => {
    const metadata = Reflect.getMetadata(
      TOOL_V2_METADATA_KEY,
      TestTools.prototype,
      "getWeather",
    ) as ToolV2AnnotationMetadata;

    assert.exists(metadata.parameters);
    assert.exists(metadata.returns);
    await expect(
      isStandardSchemaValid(metadata.parameters, { city: "seoul" }),
    ).resolves.toBeTruthy();
    await expect(
      isStandardSchemaValid(metadata.returns, { temperature: 18 }),
    ).resolves.toBeTruthy();
  });

  it("supports ToolContextSchema inside object parameters", async () => {
    class ContextTools {
      @ToolV2({
        name: "contextEcho",
        parameters: z.object({
          toolContext: ToolContextSchema,
        }),
        returns: z.string(),
      })
      contextEcho(input: { toolContext: ToolContext }) {
        return JSON.stringify(input.toolContext.context);
      }
    }

    const metadata = Reflect.getMetadata(
      TOOL_V2_METADATA_KEY,
      ContextTools.prototype,
      "contextEcho",
    ) as ToolV2AnnotationMetadata;

    assert.exists(metadata.parameters);
    await expect(
      isStandardSchemaValid(metadata.parameters, {
        toolContext: new ToolContext({ foo: "bar" }),
      }),
    ).resolves.toBeTruthy();
    await expect(
      isStandardSchemaValid(metadata.parameters, {
        toolContext: { context: { foo: "bar" } },
      }),
    ).resolves.toBeFalsy();
  });
});

async function isStandardSchemaValid(
  schema: NonNullable<
    ToolV2AnnotationMetadata["parameters"] | ToolV2AnnotationMetadata["returns"]
  >,
  value: unknown,
): Promise<boolean> {
  const result = await schema["~standard"].validate(value);
  return result.issues == null;
}
