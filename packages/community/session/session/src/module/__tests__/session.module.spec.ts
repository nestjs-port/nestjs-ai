import "reflect-metadata";
import { Module } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";
import { CreateSessionRequest } from "../../create-session-request.js";
import { DefaultSessionService } from "../../default-session-service.js";
import { InMemorySessionRepository } from "../../in-memory-session-repository.js";
import type { SessionRepository } from "../../session-repository.js";
import type { SessionService } from "../../session-service.js";
import { SessionModule } from "../session.module.js";
import {
  SESSION_REPOSITORY_TOKEN,
  SESSION_SERVICE_TOKEN,
} from "../session.tokens.js";

const REPO_SOURCE_TOKEN = Symbol.for("REPO_SOURCE_TEST_TOKEN");
const sharedRepository = new InMemorySessionRepository();

/** A standalone repository module that provides a repository under a custom token. */
@Module({
  providers: [{ provide: REPO_SOURCE_TOKEN, useValue: sharedRepository }],
  exports: [REPO_SOURCE_TOKEN],
})
class RepoSourceModule {}

describe("SessionModule", () => {
  it("forRoot provides a SessionService backed by the given repository", async () => {
    const repository = new InMemorySessionRepository();

    const moduleRef = await Test.createTestingModule({
      imports: [SessionModule.forRoot({ sessionRepository: repository })],
    }).compile();

    const service = moduleRef.get<SessionService>(SESSION_SERVICE_TOKEN);
    expect(service).toBeInstanceOf(DefaultSessionService);

    // The repository token resolves to the exact instance that was provided
    expect(moduleRef.get<SessionRepository>(SESSION_REPOSITORY_TOKEN)).toBe(
      repository,
    );

    // The wired service is functional end-to-end
    const session = await service.create(
      new CreateSessionRequest({ userId: "user-1" }),
    );
    expect(await service.findById(session.id)).not.toBeNull();
  });

  it("forRootAsync provides a SessionService from an async repository factory", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        SessionModule.forRootAsync({
          useFactory: () => Promise.resolve(new InMemorySessionRepository()),
        }),
      ],
    }).compile();

    const service = moduleRef.get<SessionService>(SESSION_SERVICE_TOKEN);
    expect(service).toBeInstanceOf(DefaultSessionService);

    const session = await service.create(
      new CreateSessionRequest({ userId: "user-2" }),
    );
    expect(session.userId).toBe("user-2");
  });

  it("forRootAsync resolves the repository from an imported module via inject", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        SessionModule.forRootAsync({
          imports: [RepoSourceModule],
          inject: [REPO_SOURCE_TOKEN],
          useFactory: (repository: SessionRepository) => repository,
        }),
      ],
    }).compile();

    expect(moduleRef.get<SessionRepository>(SESSION_REPOSITORY_TOKEN)).toBe(
      sharedRepository,
    );
  });

  it("forRoot applies the configured defaultTimeToLiveMs to created sessions", async () => {
    const twoHoursMs = 2 * 60 * 60 * 1000;
    const moduleRef = await Test.createTestingModule({
      imports: [
        SessionModule.forRoot({
          sessionRepository: new InMemorySessionRepository(),
          defaultTimeToLiveMs: twoHoursMs,
        }),
      ],
    }).compile();

    const service = moduleRef.get<SessionService>(SESSION_SERVICE_TOKEN);
    const before = Date.now();
    const session = await service.create(
      new CreateSessionRequest({ userId: "user-ttl" }),
    );

    const expiresAt = session.expiresAt?.getTime() ?? 0;
    expect(expiresAt).toBeGreaterThanOrEqual(before + twoHoursMs - 5000);
    expect(expiresAt).toBeLessThanOrEqual(Date.now() + twoHoursMs + 5000);
  });
});
