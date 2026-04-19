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

export interface AnthropicWebSearchToolProps {
  allowedDomains?: string[] | null;
  blockedDomains?: string[] | null;
  maxUses?: number | null;
  userLocation?: AnthropicWebSearchTool.UserLocationProps | null;
}

/**
 * Configuration for Anthropic's built-in web search tool. When enabled, Claude can
 * search the web during a conversation and use the results to generate cited
 * responses.
 *
 * Example usage:
 * ```ts
 * const webSearch = new AnthropicWebSearchTool({
 *   allowedDomains: ["docs.spring.io", "github.com"],
 *   maxUses: 5,
 * });
 *
 * const options = AnthropicChatOptions.builder()
 *   .webSearchTool(webSearch)
 *   .build();
 * ```
 *
 * @see https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/web-search
 */
export class AnthropicWebSearchTool {
  private _allowedDomains: string[] | null;
  private _blockedDomains: string[] | null;
  private _maxUses: number | null;
  private _userLocation: AnthropicWebSearchTool.UserLocation | null;

  constructor(props: AnthropicWebSearchToolProps) {
    this._allowedDomains =
      props.allowedDomains != null ? [...props.allowedDomains] : null;
    this._blockedDomains =
      props.blockedDomains != null ? [...props.blockedDomains] : null;
    this._maxUses = props.maxUses ?? null;
    this._userLocation =
      props.userLocation != null
        ? AnthropicWebSearchTool.UserLocation.from(props.userLocation)
        : null;
  }

  get allowedDomains(): string[] | null {
    return this._allowedDomains;
  }

  setAllowedDomains(allowedDomains: string[] | null): void {
    this._allowedDomains = allowedDomains;
  }

  get blockedDomains(): string[] | null {
    return this._blockedDomains;
  }

  setBlockedDomains(blockedDomains: string[] | null): void {
    this._blockedDomains = blockedDomains;
  }

  get maxUses(): number | null {
    return this._maxUses;
  }

  setMaxUses(maxUses: number | null): void {
    this._maxUses = maxUses;
  }

  get userLocation(): AnthropicWebSearchTool.UserLocation | null {
    return this._userLocation;
  }

  setUserLocation(
    userLocation: AnthropicWebSearchTool.UserLocation | null,
  ): void {
    this._userLocation = userLocation;
  }
}

export namespace AnthropicWebSearchTool {
  export interface UserLocationProps {
    city?: string | null;
    country?: string | null;
    region?: string | null;
    timezone?: string | null;
  }

  export class UserLocation {
    constructor(
      public readonly city: string | null,
      public readonly country: string | null,
      public readonly region: string | null,
      public readonly timezone: string | null,
    ) {}

    static from(props: UserLocationProps): UserLocation {
      return new UserLocation(
        props.city ?? null,
        props.country ?? null,
        props.region ?? null,
        props.timezone ?? null,
      );
    }
  }
}
