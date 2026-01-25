/**
 * Metadata about a tool specification and execution.
 */
export abstract class ToolMetadata {
	/**
	 * Whether the tool result should be returned directly or passed back to the model.
	 */
	returnDirect(): boolean {
		return false;
	}

	/**
	 * Create a default {@link ToolMetadata} builder.
	 */
	static builder(): ToolMetadataBuilder {
		return new ToolMetadataBuilder();
	}

	/**
	 * Create a default {@link ToolMetadata} instance from a method.
	 * Note: This method is not fully implemented as it requires Java reflection utilities.
	 * @param method - The method to create ToolMetadata from
	 * @returns A ToolMetadata instance
	 * @throws Error if method is null
	 */
	static from(method: unknown): ToolMetadata {
		if (method === null || method === undefined) {
			throw new Error("method cannot be null");
		}
		// TODO: Implement ToolUtils.getToolReturnDirect equivalent
		return ToolMetadata.builder().build();
	}
}

/**
 * Builder for creating {@link ToolMetadata} instances.
 */
export class ToolMetadataBuilder {
	private _returnDirect = false;

	/**
	 * Set whether the tool result should be returned directly.
	 * @param returnDirect - true if the tool result should be returned directly
	 * @returns The builder instance for method chaining
	 */
	returnDirect(returnDirect: boolean): this {
		this._returnDirect = returnDirect;
		return this;
	}

	/**
	 * Build a {@link ToolMetadata} instance.
	 * @returns A ToolMetadata instance with the configured values
	 */
	build(): ToolMetadata {
		return new DefaultToolMetadata(this._returnDirect);
	}
}

/**
 * Default implementation of {@link ToolMetadata}.
 */
class DefaultToolMetadata extends ToolMetadata {
	private readonly _returnDirect: boolean;

	constructor(returnDirect: boolean) {
		super();
		this._returnDirect = returnDirect;
	}

	override returnDirect(): boolean {
		return this._returnDirect;
	}
}
