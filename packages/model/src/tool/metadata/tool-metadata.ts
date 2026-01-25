import assert from "node:assert/strict";
import { ToolUtils } from "../support";

/**
 * Props for creating a {@link ToolMetadata} instance.
 */
export interface ToolMetadataProps {
	/**
	 * Whether the tool result should be returned directly or passed back to the model.
	 */
	returnDirect?: boolean;
}

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
	static create(props: ToolMetadataProps = {}): ToolMetadata {
		const returnDirect = props.returnDirect ?? false;
		return new (class extends ToolMetadata {
			override returnDirect(): boolean {
				return returnDirect;
			}
		})();
	}

	/**
	 * Create a default {@link ToolMetadata} instance from a method.
	 */
	static from(target: object, propertyKey: string | symbol): ToolMetadata {
		assert(target, "target cannot be null");
		assert(propertyKey, "propertyKey cannot be null");

		return ToolMetadata.create({
			returnDirect: ToolUtils.getToolReturnDirect(target, propertyKey),
		});
	}
}
