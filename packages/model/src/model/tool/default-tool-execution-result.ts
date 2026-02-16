import assert from "node:assert/strict";
import type { Message } from "../../chat";
import { ToolExecutionResult } from "./tool-execution-result";

export interface DefaultToolExecutionResultProps {
	conversationHistory: Message[];
	returnDirect?: boolean;
}

/**
 * Default implementation of {@link ToolExecutionResult}.
 */
export class DefaultToolExecutionResult extends ToolExecutionResult {
	private readonly _conversationHistory: Message[];
	private readonly _returnDirect: boolean;

	constructor(props: DefaultToolExecutionResultProps) {
		super();
		assert(props.conversationHistory, "conversationHistory cannot be null");
		assert(
			props.conversationHistory.every((msg) => msg != null),
			"conversationHistory cannot contain null elements",
		);
		this._conversationHistory = props.conversationHistory;
		this._returnDirect = props.returnDirect ?? false;
	}

	conversationHistory(): Message[] {
		return this._conversationHistory;
	}

	returnDirect(): boolean {
		return this._returnDirect;
	}
}
