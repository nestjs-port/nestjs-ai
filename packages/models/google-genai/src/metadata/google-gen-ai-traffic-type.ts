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
