import {
	LoggerFactory,
	ms,
	type ResponseErrorHandler,
	type Retryable,
	RetryException,
	RetryPolicy,
	RetryTemplate,
} from "@nestjs-ai/commons";
import { NonTransientAiException } from "./non-transient-ai-exception";
import { TransientAiException } from "./transient-ai-exception";

/**
 * RetryUtils is a utility class for configuring and handling retry operations.
 * It provides a default RetryTemplate and a default ResponseErrorHandler.
 */
export class RetryUtils {
	private static readonly DEFAULT_MAX_ATTEMPTS = 10;

	private static readonly DEFAULT_INITIAL_INTERVAL = ms(2000);

	private static readonly DEFAULT_MULTIPLIER = 5;

	private static readonly DEFAULT_MAX_INTERVAL = ms(3 * 60000);

	private static readonly SHORT_INITIAL_INTERVAL = ms(100);

	private static readonly logger = LoggerFactory.getLogger(RetryUtils.name);

	private constructor() {
		// Prevent instantiation - utility class
	}

	/**
	 * Default ResponseErrorHandler implementation.
	 */
	static readonly DEFAULT_RESPONSE_ERROR_HANDLER: ResponseErrorHandler = {
		hasError(response: Response): boolean {
			return !response.ok;
		},

		async handleError(response: Response): Promise<void> {
			const status = response.status;
			if (status >= 400) {
				const errorBody = await response.text();
				const message = `${status} - ${errorBody || response.statusText}`;

				/*
				 * Thrown on 4xx client errors, such as:
				 * - 401 - Incorrect API key provided
				 * - 401 - You must be a member of an organization to use the API
				 * - 429 - Rate limit reached for requests
				 * - 429 - You exceeded your current quota, please check your plan and billing details
				 */
				if (status >= 400 && status < 500) {
					throw new NonTransientAiException(message);
				}

				// 5xx server errors are transient and can be retried
				throw new TransientAiException(message);
			}
		},
	};

	/**
	 * Default RetryTemplate with exponential backoff configuration.
	 */
	static readonly DEFAULT_RETRY_TEMPLATE: RetryTemplate =
		RetryUtils.createDefaultRetryTemplate();

	/**
	 * Short RetryTemplate for testing scenarios.
	 */
	static readonly SHORT_RETRY_TEMPLATE: RetryTemplate =
		RetryUtils.createShortRetryTemplate();

	private static createDefaultRetryTemplate(): RetryTemplate {
		const retryPolicy = RetryPolicy.builder()
			.maxRetries(RetryUtils.DEFAULT_MAX_ATTEMPTS)
			.includes(TransientAiException)
			.delay(RetryUtils.DEFAULT_INITIAL_INTERVAL)
			.multiplier(RetryUtils.DEFAULT_MULTIPLIER)
			.maxDelay(RetryUtils.DEFAULT_MAX_INTERVAL)
			.build();

		const retryTemplate = new RetryTemplate(retryPolicy);

		let retryCount = 0;
		retryTemplate.retryListener = {
			onRetryFailure(
				_policy: RetryPolicy,
				_retryable: Retryable,
				_name: string,
				throwable: unknown,
			): void {
				retryCount++;
				if (throwable instanceof Error) {
					RetryUtils.logger.warn(
						`Retry error. Retry count: ${retryCount}`,
						throwable,
					);
				} else {
					RetryUtils.logger.warn(
						`Retry error. Retry count: ${retryCount}, error: ${throwable}`,
					);
				}
			},
		};
		return retryTemplate;
	}

	/**
	 * Useful in testing scenarios where you don't want to wait long for retry
	 * and don't need to show stack trace.
	 */
	private static createShortRetryTemplate(): RetryTemplate {
		const retryPolicy = RetryPolicy.builder()
			.maxRetries(RetryUtils.DEFAULT_MAX_ATTEMPTS)
			.includes(TransientAiException)
			.delay(RetryUtils.SHORT_INITIAL_INTERVAL)
			.build();

		const retryTemplate = new RetryTemplate(retryPolicy);

		let retryCount = 0;
		retryTemplate.retryListener = {
			onRetryFailure(
				_policy: RetryPolicy,
				_retryable: Retryable,
				_name: string,
				throwable: unknown,
			): void {
				retryCount++;
				if (throwable instanceof Error) {
					RetryUtils.logger.warn(
						`Retry error. Retry count: ${retryCount}`,
						throwable,
					);
				} else {
					RetryUtils.logger.warn(
						`Retry error. Retry count: ${retryCount}, error: ${throwable}`,
					);
				}
			},
		};
		return retryTemplate;
	}

	/**
	 * Generic execute method to run retryable operations with the provided RetryTemplate.
	 *
	 * @param retryTemplate the RetryTemplate to use for executing the retryable operation
	 * @param retryable the operation to be retried
	 * @returns the result of the retryable operation
	 * @throws the original RuntimeException if retry fails
	 */
	static async execute<R>(
		retryTemplate: RetryTemplate,
		retryable: Retryable<R>,
	): Promise<R> {
		try {
			return await retryTemplate.execute(retryable);
		} catch (e) {
			if (e instanceof RetryException) {
				const cause = e.cause;
				if (cause instanceof Error) {
					throw cause;
				}
				throw new Error(e.message, { cause });
			}
			throw e;
		}
	}
}
