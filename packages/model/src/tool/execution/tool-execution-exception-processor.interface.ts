import type { ToolExecutionException } from "./tool-execution-exception";

/**
 * A functional interface to process a {@link ToolExecutionException} by either converting
 * the error message to a String that can be sent back to the AI model or throwing an
 * exception to be handled by the caller.
 */
export interface ToolExecutionExceptionProcessor {
	/**
	 * Convert an exception thrown by a tool to a String that can be sent back to the AI
	 * model or throw an exception to be handled by the caller.
	 */
	process(exception: ToolExecutionException): string;
}
