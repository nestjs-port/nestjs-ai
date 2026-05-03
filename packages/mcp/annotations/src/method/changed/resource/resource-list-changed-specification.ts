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
import type { Resource } from "@modelcontextprotocol/server";

export type ResourceListChangedHandler = (
  updatedResources: Resource[],
) => void | Promise<void>;

export interface ResourceListChangedSpecificationProps {
  clients: string[];
  resourceListChangeHandler: ResourceListChangedHandler;
}

export class ResourceListChangedSpecification {
  readonly clients: string[];

  readonly resourceListChangeHandler: ResourceListChangedHandler;

  constructor(props: ResourceListChangedSpecificationProps) {
    assert(props.clients != null, "clients must not be null");
    if (
      props.clients.length === 0 ||
      props.clients.some((client) => client.trim().length === 0)
    ) {
      throw new Error("clients must not be empty");
    }
    assert(
      props.resourceListChangeHandler != null,
      "resourceListChangeHandler must not be null",
    );
    this.clients = [...props.clients];
    this.resourceListChangeHandler = props.resourceListChangeHandler;
  }
}
