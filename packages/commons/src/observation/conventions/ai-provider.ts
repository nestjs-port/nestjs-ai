/**
 * Collection of systems providing AI functionality. Based on the OpenTelemetry Semantic
 * Conventions for AI Systems.
 *
 * @see {@link https://github.com/open-telemetry/semantic-conventions/tree/main/docs/gen-ai | OTel Semantic Conventions}
 */
export class AiProvider {
	private readonly _value: string;
	private readonly _name: string;

	private constructor(name: string, value: string) {
		this._name = name;
		this._value = value;
	}

	/**
	 * Return the value of the provider.
	 * @returns the value of the provider
	 */
	value(): string {
		return this._value;
	}

	/**
	 * Get the name of this provider.
	 * @returns the name (e.g., "ANTHROPIC", "OPENAI", "AZURE_OPENAI")
	 */
	getName(): string {
		return this._name;
	}

	/**
	 * Convert to string representation (returns the name in uppercase).
	 * @returns the name of the provider
	 */
	toString(): string {
		return this._name;
	}

	/**
	 * Convert to primitive value (returns the string value for JSON serialization).
	 */
	[Symbol.toPrimitive](hint: string): string {
		if (hint === "string") {
			return this._name;
		}
		return this._value;
	}

	/**
	 * AI system provided by Anthropic.
	 */
	static readonly ANTHROPIC = new AiProvider("ANTHROPIC", "anthropic");

	/**
	 * AI system provided by Azure.
	 */
	static readonly AZURE_OPENAI = new AiProvider("AZURE_OPENAI", "azure-openai");

	/**
	 * AI system provided by Bedrock Converse.
	 */
	static readonly BEDROCK_CONVERSE = new AiProvider(
		"BEDROCK_CONVERSE",
		"bedrock_converse",
	);

	/**
	 * AI system provided by DeepSeek.
	 */
	static readonly DEEPSEEK = new AiProvider("DEEPSEEK", "deepseek");

	/**
	 * AI system provided by Google Gen AI.
	 */
	static readonly GOOGLE_GENAI_AI = new AiProvider(
		"GOOGLE_GENAI_AI",
		"google_genai",
	);

	/**
	 * AI system provided by Minimax.
	 */
	static readonly MINIMAX = new AiProvider("MINIMAX", "minimax");

	/**
	 * AI system provided by Mistral.
	 */
	static readonly MISTRAL_AI = new AiProvider("MISTRAL_AI", "mistral_ai");

	/**
	 * AI system provided by Oracle OCI.
	 */
	static readonly OCI_GENAI = new AiProvider("OCI_GENAI", "oci_genai");

	/**
	 * AI system provided by Ollama.
	 */
	static readonly OLLAMA = new AiProvider("OLLAMA", "ollama");

	/**
	 * AI system provided by ONNX.
	 */
	static readonly ONNX = new AiProvider("ONNX", "onnx");

	/**
	 * AI system provided by OpenAI.
	 */
	static readonly OPENAI = new AiProvider("OPENAI", "openai");

	/**
	 * AI system provided by the official OpenAI SDK.
	 */
	static readonly OPENAI_SDK = new AiProvider("OPENAI_SDK", "openai_sdk");

	/**
	 * AI system provided by Spring AI.
	 */
	static readonly SPRING_AI = new AiProvider("SPRING_AI", "spring_ai");

	/**
	 * AI system provided by Vertex AI.
	 */
	static readonly VERTEX_AI = new AiProvider("VERTEX_AI", "vertex_ai");

	/**
	 * AI system provided by Zhipuai.
	 */
	static readonly ZHIPUAI = new AiProvider("ZHIPUAI", "zhipuai");
}
