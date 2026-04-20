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

import { LoggerFactory } from "@nestjs-ai/commons";
import { z } from "zod";

export const MockWeatherRequestInputType = z
  .object({
    location: z.string().describe("The city and state e.g. San Francisco, CA"),
    lat: z.number().describe("The city latitude"),
    lon: z.number().describe("The city longitude"),
    unit: z.enum(["C", "F"]).describe("Temperature unit"),
  })
  .describe("Weather API request");

export type MockWeatherRequest = {
  location: string;
  lat: number;
  lon: number;
  unit: "C" | "F";
};

export type MockWeatherResponse = {
  temp: number;
  feels_like: number;
  temp_min: number;
  temp_max: number;
  pressure: number;
  humidity: number;
  unit: "C" | "F";
};

const logger = LoggerFactory.getLogger("MockWeatherService");

export class MockWeatherService {
  apply(request: MockWeatherRequest): MockWeatherResponse {
    logger.info(
      "Received weather request for location: %s, lat: %s, lon: %s, unit: %s",
      request.location,
      request.lat,
      request.lon,
      request.unit,
    );

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
      feels_like: 15,
      temp_min: 5,
      temp_max: 35,
      pressure: 53,
      humidity: 45,
      unit: "C",
    };
  }
}
