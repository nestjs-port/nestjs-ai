/**
 * Collection of systems providing AI functionality. Based on the OpenTelemetry Semantic
 * Conventions for AI Systems.
 *
 * @see {@link https://github.com/open-telemetry/semantic-conventions/tree/main/docs/gen-ai | OTel Semantic Conventions}
 */
export class AiProvider {
	/**
	 * AI system provided by Anthropic.
	 */
	static readonly ANTHROPIC = new AiProvider("anthropic");

	/**
	 * AI system provided by Azure.
	 */
	static readonly AZURE_OPENAI = new AiProvider("azure-openai");

	/**
	 * AI system provided by Bedrock Converse.
	 */
	static readonly BEDROCK_CONVERSE = new AiProvider("bedrock_converse");

	/**
	 * AI system provided by DeepSeek.
	 */
	static readonly DEEPSEEK = new AiProvider("deepseek");

	/**
	 * AI system provided by Google Gen AI.
	 */
	static readonly GOOGLE_GENAI_AI = new AiProvider("google_genai");

	/**
	 * AI system provided by Minimax.
	 */
	static readonly MINIMAX = new AiProvider("minimax");

	/**
	 * AI system provided by Mistral.
	 */
	static readonly MISTRAL_AI = new AiProvider("mistral_ai");

	/**
	 * AI system provided by Oracle OCI.
	 */
	static readonly OCI_GENAI = new AiProvider("oci_genai");

	/**
	 * AI system provided by Ollama.
	 */
	static readonly OLLAMA = new AiProvider("ollama");

	/**
	 * AI system provided by ONNX.
	 */
	static readonly ONNX = new AiProvider("onnx");

	/**
	 * AI system provided by OpenAI.
	 */
	static readonly OPENAI = new AiProvider("openai");

	/**
	 * AI system provided by the official OpenAI SDK.
	 */
	static readonly OPENAI_SDK = new AiProvider("openai_sdk");

	/**
	 * AI system provided by Spring AI.
	 */
	static readonly SPRING_AI = new AiProvider("spring_ai");

	/**
	 * AI system provided by Vertex AI.
	 */
	static readonly VERTEX_AI = new AiProvider("vertex_ai");

	/**
	 * AI system provided by Zhipuai.
	 */
	static readonly ZHIPUAI = new AiProvider("zhipuai");

	private constructor(private readonly _value: string) {}

	/**
	 * Return the value of the provider.
	 * @returns the value of the provider
	 */
	get value(): string {
		return this._value;
	}
}
