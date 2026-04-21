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
import type { ProviderInstanceExplorer } from "@nestjs-port/core";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { Tool } from "../../annotation";
import { NestProviderToolCallbackResolver } from "../nest-provider-tool-callback-resolver";

class WeatherTools {
  @Tool({
    name: "currentWeather",
    returns: z.string(),
  })
  currentWeather(): string {
    return "sunny";
  }
}

class NoToolMethods {
  helper(): string {
    return "noop";
  }
}

class StaticTools {
  @Tool({
    name: "staticTool",
    returns: z.string(),
  })
  static staticTool(): string {
    return "static";
  }
}

class DuplicateWeatherTools {
  @Tool({
    name: "currentWeather",
    returns: z.string(),
  })
  currentWeather(): string {
    return "cloudy";
  }
}

describe("NestProviderToolCallbackResolver", () => {
  it("resolves tool callback discovered from provider instances", () => {
    const explorer: ProviderInstanceExplorer = {
      getProviderInstances: () => [new WeatherTools(), new NoToolMethods()],
    };
    const resolver = new NestProviderToolCallbackResolver(explorer);

    const toolCallback = resolver.resolve("currentWeather");

    expect(toolCallback).not.toBeNull();
    expect(toolCallback?.toolDefinition.name).toBe("currentWeather");
  });

  it("returns null when no matching tool callback exists", () => {
    const explorer: ProviderInstanceExplorer = {
      getProviderInstances: () => [new WeatherTools()],
    };
    const resolver = new NestProviderToolCallbackResolver(explorer);

    const toolCallback = resolver.resolve("unknownTool");

    expect(toolCallback).toBeNull();
  });

  it("discovers static tool methods from provider classes", () => {
    const explorer: ProviderInstanceExplorer = {
      getProviderInstances: () => [new StaticTools()],
    };
    const resolver = new NestProviderToolCallbackResolver(explorer);

    const toolCallback = resolver.resolve("staticTool");

    expect(toolCallback).not.toBeNull();
    expect(toolCallback?.toolDefinition.name).toBe("staticTool");
  });

  it("initializes cache once and reuses it for subsequent resolves", () => {
    const getProviderInstances = vi
      .fn<ProviderInstanceExplorer["getProviderInstances"]>()
      .mockReturnValue([new WeatherTools()]);
    const explorer: ProviderInstanceExplorer = { getProviderInstances };
    const resolver = new NestProviderToolCallbackResolver(explorer);

    resolver.resolve("currentWeather");
    resolver.resolve("currentWeather");

    expect(getProviderInstances).toHaveBeenCalledTimes(1);
  });

  it("when duplicate tool names across providers then overwrite in cache", () => {
    const explorer: ProviderInstanceExplorer = {
      getProviderInstances: () => [
        new WeatherTools(),
        new DuplicateWeatherTools(),
      ],
    };
    const resolver = new NestProviderToolCallbackResolver(explorer);

    const toolCallback = resolver.resolve("currentWeather");

    expect(toolCallback).not.toBeNull();
  });
});
