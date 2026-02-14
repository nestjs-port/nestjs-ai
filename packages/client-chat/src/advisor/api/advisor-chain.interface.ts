/**
 * Defines the context for executing a chain of advisors as part of processing a chat
 * request.
 *
 * Observation support is intentionally excluded for now.
 */
export type AdvisorChain = Record<string, never>;
