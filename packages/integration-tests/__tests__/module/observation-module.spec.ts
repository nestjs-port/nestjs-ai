/*
 * Copyright 2026-present the original author or authors.
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
import { Module } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import {
  METER_REGISTRY_TOKEN,
  OBSERVATION_REGISTRY_TOKEN,
  ObservationFilters,
  ObservationHandlers,
  TOOL_CALLING_OBSERVATION_PROPERTIES_TOKEN,
} from "@nestjs-ai/commons";
import {
  ObservationModule,
  ObservationProviderPostProcessor,
  OtelMeterRegistry,
} from "@nestjs-ai/observation";
import { describe, expect, it } from "vitest";

const OBSERVATION_CONFIG_TOKEN = Symbol("OBSERVATION_CONFIG_TOKEN");

@Module({
  providers: [
    {
      provide: OBSERVATION_CONFIG_TOKEN,
      useValue: {
        meter: {
          createCounter: () => ({
            add: () => undefined,
          }),
        },
        toolCalling: { includeContent: true },
      },
    },
  ],
  exports: [OBSERVATION_CONFIG_TOKEN],
})
class ObservationConfigModule {}

describe("ObservationModule", () => {
  describe("forRoot", () => {
    it("resolves the default observation providers via NestJS DI", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [ObservationModule.forRoot({})],
      }).compile();

      expect(moduleRef.get(OBSERVATION_REGISTRY_TOKEN)).toBeDefined();
      expect(moduleRef.get(ObservationHandlers)).toBeDefined();
      expect(moduleRef.get(ObservationFilters)).toBeDefined();
      expect(moduleRef.get(ObservationProviderPostProcessor)).toBeDefined();
      expect(moduleRef.get(OtelMeterRegistry)).toBeNull();
      expect(moduleRef.get(METER_REGISTRY_TOKEN)).toBeNull();
      expect(
        moduleRef.get(TOOL_CALLING_OBSERVATION_PROPERTIES_TOKEN),
      ).toBeUndefined();
    });

    it("creates a meter registry when meter is provided", async () => {
      const meter = {
        createCounter: () => ({
          add: () => undefined,
        }),
      };

      const moduleRef = await Test.createTestingModule({
        imports: [
          ObservationModule.forRoot({
            meter: meter as never,
          }),
        ],
      }).compile();

      expect(moduleRef.get(OtelMeterRegistry)).toBeInstanceOf(
        OtelMeterRegistry,
      );
      expect(moduleRef.get(METER_REGISTRY_TOKEN)).toBeInstanceOf(
        OtelMeterRegistry,
      );
    });

    it("exposes tool calling observation properties when content logging is enabled", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          ObservationModule.forRoot({
            toolCalling: { includeContent: true },
          }),
        ],
      }).compile();

      expect(moduleRef.get(TOOL_CALLING_OBSERVATION_PROPERTIES_TOKEN)).toEqual({
        includeContent: true,
      });
    });

    it("keeps tool calling observation properties undefined when content logging is disabled", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          ObservationModule.forRoot({
            toolCalling: { includeContent: false },
          }),
        ],
      }).compile();

      expect(
        moduleRef.get(TOOL_CALLING_OBSERVATION_PROPERTIES_TOKEN),
      ).toBeUndefined();
    });

    it("is global by default", () => {
      expect(ObservationModule.forRoot({}).global).toBe(true);
    });

    it("supports global false", () => {
      expect(ObservationModule.forRoot({ global: false }).global).toBe(false);
    });
  });

  describe("forRootAsync", () => {
    it("supports async factory with imports and inject", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          ObservationModule.forRootAsync({
            imports: [ObservationConfigModule],
            inject: [OBSERVATION_CONFIG_TOKEN],
            useFactory: (config: {
              meter: never;
              toolCalling: { includeContent: boolean };
            }) => config,
          }),
        ],
      }).compile();

      expect(moduleRef.get(OtelMeterRegistry)).toBeInstanceOf(
        OtelMeterRegistry,
      );
      expect(moduleRef.get(METER_REGISTRY_TOKEN)).toBeInstanceOf(
        OtelMeterRegistry,
      );
      expect(moduleRef.get(TOOL_CALLING_OBSERVATION_PROPERTIES_TOKEN)).toEqual({
        includeContent: true,
      });
    });

    it("supports async factory returning a Promise", async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [
          ObservationModule.forRootAsync({
            useFactory: async () => ({
              toolCalling: { includeContent: true },
            }),
          }),
        ],
      }).compile();

      expect(moduleRef.get(TOOL_CALLING_OBSERVATION_PROPERTIES_TOKEN)).toEqual({
        includeContent: true,
      });
    });

    it("defaults global to true for async", () => {
      expect(
        ObservationModule.forRootAsync({
          useFactory: () => ({}),
        }).global,
      ).toBe(true);
    });
  });
});
