import {
  type DynamicModule,
  type InjectionToken,
  Module,
  type ModuleMetadata,
} from "@nestjs/common";
import { DefaultSessionService } from "../default-session-service.js";
import type { SessionRepository } from "../session-repository.js";
import {
  SESSION_REPOSITORY_TOKEN,
  SESSION_SERVICE_TOKEN,
} from "./session.tokens.js";

export interface SessionModuleOptions {
  /** The repository the session service is backed by. */
  sessionRepository: SessionRepository;
  global?: boolean;
}

export interface SessionModuleAsyncOptions {
  imports?: ModuleMetadata["imports"];
  inject?: InjectionToken[];
  /** Factory producing the {@link SessionRepository} the session service is backed by. */
  useFactory: (
    ...args: never[]
  ) => Promise<SessionRepository> | SessionRepository;
  global?: boolean;
}

/**
 * Provides a {@link SessionService} (backed by {@link DefaultSessionService}) over a
 * configurable {@link SessionRepository}.
 *
 * The repository is supplied via the options — either an instance ({@link forRoot}) or a
 * factory ({@link forRootAsync}). The service itself is repository-agnostic, mirroring
 * Spring's `SessionServiceAutoConfiguration`, so any repository (in-memory, JDBC, …) works.
 * Both {@link SESSION_REPOSITORY_TOKEN} and {@link SESSION_SERVICE_TOKEN} are exported.
 */
@Module({})
export class SessionModule {
  static forRoot(options: SessionModuleOptions): DynamicModule {
    return SessionModule.forRootAsync({
      useFactory: () => options.sessionRepository,
      global: options.global,
    });
  }

  static forRootAsync(options: SessionModuleAsyncOptions): DynamicModule {
    return {
      module: SessionModule,
      imports: options.imports ?? [],
      providers: [
        {
          provide: SESSION_REPOSITORY_TOKEN,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        {
          provide: SESSION_SERVICE_TOKEN,
          useFactory: (sessionRepository: SessionRepository) =>
            new DefaultSessionService(sessionRepository),
          inject: [SESSION_REPOSITORY_TOKEN],
        },
      ],
      exports: [SESSION_REPOSITORY_TOKEN, SESSION_SERVICE_TOKEN],
      global: options.global ?? false,
    };
  }
}
