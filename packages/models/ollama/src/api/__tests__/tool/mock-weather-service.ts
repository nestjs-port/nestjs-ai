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

export enum Unit {
  C = "C",
  F = "F",
}

export const UnitName: Record<Unit, string> = {
  [Unit.C]: "metric",
  [Unit.F]: "imperial",
};

export interface MockWeatherRequest {
  location: string;
  unit: Unit;
}

export interface MockWeatherResponse {
  temp: number;
  feels_like: number;
  temp_min: number;
  temp_max: number;
  pressure: number;
  humidity: number;
  unit: Unit;
}

export class MockWeatherService {
  apply(request: MockWeatherRequest): MockWeatherResponse {
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
      temp_min: 20,
      temp_max: 2,
      pressure: 53,
      humidity: 45,
      unit: Unit.C,
    };
  }
}
