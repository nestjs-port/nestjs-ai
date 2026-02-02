/**
 * Response error handler interface for handling HTTP response errors.
 */
export interface ResponseErrorHandler {
	/**
	 * Check if the response has an error.
	 * @param response - The HTTP response object
	 * @returns true if the response has an error
	 */
	hasError(response: Response): boolean;

	/**
	 * Handle the error response.
	 * @param response - The HTTP response object
	 */
	handleError(response: Response): Promise<void>;
}
