/**
 * OpenTelemetry GenAI semantic convention metric names.
 *
 * @see {@link https://github.com/open-telemetry/semantic-conventions/tree/main/docs/gen-ai | OTel Semantic Conventions}
 */
export class AiObservationMetricNames {
	/**
	 * Histogram metric recording operation duration.
	 */
	static readonly OPERATION_DURATION = new AiObservationMetricNames(
		"gen_ai.client.operation.duration",
	);

	/**
	 * Counter metric recording token usage.
	 */
	static readonly TOKEN_USAGE = new AiObservationMetricNames(
		"gen_ai.client.token.usage",
	);

	private constructor(private readonly _value: string) {}

	/**
	 * Return the metric name.
	 * @returns the metric name
	 */
	get value(): string {
		return this._value;
	}
}
