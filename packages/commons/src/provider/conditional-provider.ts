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

type ConditionalProviderConfig<TResolved> = {
  token: string;
  inject: Array<{ token: unknown; optional: true }>;
  resolve: (...args: unknown[]) => TResolved;
};

type Provider = {
  provide: symbol;
  useFactory: (...args: unknown[]) => unknown;
  inject?: Array<{ token: unknown; optional: true }>;
};

type ConditionalTokenPair = {
  token: symbol;
  overrideToken: symbol;
};

function createConditionalTokens(token: string): ConditionalTokenPair {
  return {
    token: Symbol.for(token),
    overrideToken: Symbol.for(`${token}_OVERRIDE_TOKEN`),
  };
}

export function createConditionalProvider<TResolved>(
  config: ConditionalProviderConfig<TResolved>,
): {
  token: symbol;
  overrideToken: symbol;
  provider: Provider;
} {
  const tokens = createConditionalTokens(config.token);
  return {
    token: tokens.token,
    overrideToken: tokens.overrideToken,
    provider: {
      provide: tokens.token,
      useFactory: (...args: unknown[]) => config.resolve(...args),
      inject: [
        { token: tokens.overrideToken, optional: true },
        ...config.inject,
      ],
    },
  };
}
