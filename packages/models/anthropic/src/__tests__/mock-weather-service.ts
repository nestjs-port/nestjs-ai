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

import { z } from "zod";

export enum WeatherUnit {
  C = "C",
  F = "F",
}

export const WeatherRequestSchema = z
  .object({
    location: z.string().describe("The city and state e.g. San Francisco, CA"),
    unit: z.enum([WeatherUnit.C, WeatherUnit.F]).describe("Temperature unit"),
  })
  .describe("Weather API request");

export type WeatherRequest = {
  location: string;
  unit: WeatherUnit;
};

export type WeatherResponse = {
  temp: number;
  unit: WeatherUnit;
};

export class MockWeatherService {
  apply(request: WeatherRequest): WeatherResponse {
    let temperature = 0;

    if (request.location.includes("Paris")) {
      temperature = 15;
    } else if (request.location.includes("Tokyo")) {
      temperature = 10;
    } else if (request.location.includes("San Francisco")) {
      temperature = 30;
    }

    return {
      temp: temperature,
      unit: WeatherUnit.C,
    };
  }
}
