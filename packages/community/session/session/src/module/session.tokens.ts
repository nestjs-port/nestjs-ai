/**
 * Injection token for the {@link SessionRepository} implementation. Repository modules
 * (in-memory, JDBC, etc.) provide their implementation under this token; the session
 * service resolves it without depending on any concrete repository.
 */
export const SESSION_REPOSITORY_TOKEN = Symbol.for("SESSION_REPOSITORY_TOKEN");

/**
 * Injection token for the {@link SessionService} provided by {@link SessionModule}.
 */
export const SESSION_SERVICE_TOKEN = Symbol.for("SESSION_SERVICE_TOKEN");
