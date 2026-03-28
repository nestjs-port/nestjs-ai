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

import type { TrafficType } from "@google/genai";

/**
 * Represents the traffic type for Google GenAI requests, indicating whether a request
 * consumes Pay-As-You-Go or Provisioned Throughput quota.
 */
export enum GoogleGenAiTrafficType {
  /**
   * Pay-As-You-Go traffic type.
   */
  ON_DEMAND = "ON_DEMAND",

  /**
   * Provisioned Throughput traffic type.
   */
  PROVISIONED_THROUGHPUT = "PROVISIONED_THROUGHPUT",

  /**
   * Unknown or unspecified traffic type.
   */
  UNKNOWN = "UNKNOWN",
}

/**
 * Creates a GoogleGenAiTrafficType from a string value.
 * @param value - The string value to convert
 * @returns The corresponding GoogleGenAiTrafficType
 */
export function trafficTypeFrom(value?: TrafficType): GoogleGenAiTrafficType {
  if (!value) {
    return GoogleGenAiTrafficType.UNKNOWN;
  }

  const typeStr = value.toUpperCase();

  switch (typeStr) {
    case "ON_DEMAND":
      return GoogleGenAiTrafficType.ON_DEMAND;
    case "PROVISIONED_THROUGHPUT":
      return GoogleGenAiTrafficType.PROVISIONED_THROUGHPUT;
    case "TRAFFIC_TYPE_UNSPECIFIED":
      return GoogleGenAiTrafficType.UNKNOWN;
    default:
      return (
        Object.values(GoogleGenAiTrafficType).find(
          (type) => type === typeStr,
        ) ?? GoogleGenAiTrafficType.UNKNOWN
      );
  }
}
