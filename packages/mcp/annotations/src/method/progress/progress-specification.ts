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
import type { ProgressNotification } from "@modelcontextprotocol/server";

export interface ProgressSpecificationProps {
  clients: string[];
  progressHandler: (notification: ProgressNotification) => Promise<void>;
}

/**
 * Specification for asynchronous progress handlers.
 */
export class ProgressSpecification {
  readonly clients: string[];

  readonly progressHandler: (
    notification: ProgressNotification,
  ) => Promise<void>;

  constructor(props: ProgressSpecificationProps) {
    assert(props.clients != null, "clients must not be null");
    if (
      props.clients.length === 0 ||
      props.clients.some((client) => client.trim().length === 0)
    ) {
      throw new Error("At least one client Id must be specified");
    }
    assert(props.progressHandler != null, "progressHandler must not be null");
    this.clients = [...props.clients];
    this.progressHandler = props.progressHandler;
  }
}
