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

import { ms } from "@nestjs-port/core";
import { beforeEach, describe, expect, it } from "vitest";
import { CreateSessionRequest } from "../create-session-request.js";
import { DefaultSessionService } from "../default-session-service.js";
import { InMemorySessionRepository } from "../in-memory-session-repository.js";
import type { SessionService } from "../session-service.js";

/**
 * Integration tests for session lifecycle exercised end-to-end through
 * {@link DefaultSessionService} and {@link InMemorySessionRepository}.
 */
describe("SessionMemory", () => {
  let sessionService: SessionService;

  beforeEach(() => {
    sessionService = new DefaultSessionService(new InMemorySessionRepository());
  });

  // --- Session lifecycle ---

  it("create session and find by id", async () => {
    const session = await sessionService.create(
      new CreateSessionRequest({ userId: "alice" }),
    );

    expect(session.id.length).toBeGreaterThan(0);
    expect(session.userId).toBe("alice");
    expect(session.createdAt).not.toBeNull();

    const found = await sessionService.findById(session.id);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(session.id);
  });

  it("session with time to live has expires at", async () => {
    const session = await sessionService.create(
      new CreateSessionRequest({
        userId: "frank",
        timeToLive: ms(60 * 60 * 1000),
      }),
    );

    expect(session.expiresAt).not.toBeNull();
    expect(session.expiresAt?.getTime()).toBeGreaterThan(
      session.createdAt.getTime(),
    );
  });
});
