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
import { GoogleGenAI, type GoogleGenAIOptions } from "@google/genai";
import { StringUtils } from "@nestjs-port/core";

export interface GoogleGenAiEmbeddingConnectionDetailsProps {
  /**
   * Your project ID.
   */
  projectId?: string | null;
  /**
   * A location is a region you can specify in a request to control where data is stored
   * at rest. For a list of available regions, see Generative AI on Vertex AI locations.
   */
  location?: string | null;
  /**
   * The API key for using Gemini Developer API. If null, Vertex AI mode will be used.
   */
  apiKey?: string | null;
  /**
   * The GenAI Client instance configured for this connection.
   */
  genAiClient?: GoogleGenAI | null;
}

/**
 * Represents the details of a connection to the embedding service using the Google GenAI
 * SDK. It provides methods to create and configure the GenAI Client instance.
 */
export class GoogleGenAiEmbeddingConnectionDetails {
  static readonly DEFAULT_LOCATION = "us-central1";
  static readonly DEFAULT_PUBLISHER = "google";

  private readonly _projectId: string | null;
  private readonly _location: string | null;
  private readonly _apiKey: string | null;
  private readonly _genAiClient: GoogleGenAI;

  constructor(props: GoogleGenAiEmbeddingConnectionDetailsProps = {}) {
    this._projectId = props.projectId ?? null;
    this._location = props.location ?? null;
    this._apiKey = props.apiKey ?? null;
    if (props.genAiClient != null) {
      this._genAiClient = props.genAiClient;
    } else {
      const clientOptions: GoogleGenAIOptions = {};

      if (StringUtils.hasText(props.apiKey)) {
        // Use Gemini Developer API mode.
        clientOptions.apiKey = props.apiKey ?? undefined;
      } else {
        // Use Vertex AI mode.
        assert(
          StringUtils.hasText(props.projectId),
          "Project ID must be provided for Vertex AI mode",
        );

        const location = StringUtils.hasText(props.location)
          ? (props.location ?? undefined)
          : GoogleGenAiEmbeddingConnectionDetails.DEFAULT_LOCATION;

        clientOptions.vertexai = true;
        clientOptions.project = props.projectId ?? undefined;
        clientOptions.location = location;
      }

      this._genAiClient = new GoogleGenAI(clientOptions);
    }
  }

  static builder(): GoogleGenAiEmbeddingConnectionDetails.Builder {
    return new GoogleGenAiEmbeddingConnectionDetails.Builder();
  }

  get projectId(): string | null {
    return this._projectId;
  }

  get location(): string | null {
    return this._location;
  }

  get apiKey(): string | null {
    return this._apiKey;
  }

  get genAiClient(): GoogleGenAI {
    return this._genAiClient;
  }

  /**
   * Constructs the model endpoint name in the format expected by the embedding models.
   *
   * @param modelName - the model name, for example "text-embedding-004"
   * @returns the full model endpoint name
   */
  getModelEndpointName(modelName: string): string {
    // For the new SDK, we just return the model name as is.
    // The SDK handles the full endpoint construction internally.
    return modelName;
  }
}

export namespace GoogleGenAiEmbeddingConnectionDetails {
  export class Builder {
    /**
     * Your project ID.
     */
    private _projectId: string | null = null;
    /**
     * A location is a region you can specify in a request to control where data is
     * stored at rest. For a list of available regions, see Generative AI on Vertex AI
     * locations.
     */
    private _location: string | null = null;
    /**
     * The API key for using Gemini Developer API. If null, Vertex AI mode will be
     * used.
     */
    private _apiKey: string | null = null;
    /**
     * Custom GenAI client instance. If provided, other settings will be ignored.
     */
    private _genAiClient: GoogleGenAI | null = null;

    projectId(projectId: string | null): this {
      this._projectId = projectId;
      return this;
    }

    location(location: string | null): this {
      this._location = location;
      return this;
    }

    apiKey(apiKey: string | null): this {
      this._apiKey = apiKey;
      return this;
    }

    genAiClient(genAiClient: GoogleGenAI | null): this {
      this._genAiClient = genAiClient;
      return this;
    }

    build(): GoogleGenAiEmbeddingConnectionDetails {
      // If a custom client is provided, use it directly.
      if (this._genAiClient != null) {
        return new GoogleGenAiEmbeddingConnectionDetails({
          projectId: this._projectId,
          location: this._location,
          apiKey: this._apiKey,
          genAiClient: this._genAiClient,
        });
      }

      // Otherwise, build a new client.
      const clientOptions: GoogleGenAIOptions = {};

      if (StringUtils.hasText(this._apiKey)) {
        // Use Gemini Developer API mode.
        clientOptions.apiKey = this._apiKey ?? undefined;
      } else {
        // Use Vertex AI mode.
        assert(
          StringUtils.hasText(this._projectId),
          "Project ID must be provided for Vertex AI mode",
        );

        const location = StringUtils.hasText(this._location)
          ? (this._location ?? undefined)
          : GoogleGenAiEmbeddingConnectionDetails.DEFAULT_LOCATION;

        clientOptions.vertexai = true;
        clientOptions.project = this._projectId ?? undefined;
        clientOptions.location = location;
      }

      const genAiClient = new GoogleGenAI(clientOptions);

      return new GoogleGenAiEmbeddingConnectionDetails({
        projectId: this._projectId,
        location: this._location,
        apiKey: this._apiKey,
        genAiClient,
      });
    }
  }
}
