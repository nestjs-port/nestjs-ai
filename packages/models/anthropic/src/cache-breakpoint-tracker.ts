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

import { LoggerFactory } from "@nestjs-port/core";

export class CacheBreakpointTracker {
  private readonly logger = LoggerFactory.getLogger(
    CacheBreakpointTracker.name,
  );

  private count = 0;
  private hasWarned = false;

  canUse(): boolean {
    return this.count < 4;
  }

  allBreakpointsAreUsed(): boolean {
    return !this.canUse();
  }

  use(): void {
    if (this.count < 4) {
      this.count++;
      return;
    }

    if (!this.hasWarned) {
      this.logger.warn(
        "Anthropic cache breakpoint limit (4) reached. Additional cache_control directives will be ignored. Consider using fewer cache strategies or simpler content structure.",
      );
      this.hasWarned = true;
    }
  }

  getCount(): number {
    return this.count;
  }
}
