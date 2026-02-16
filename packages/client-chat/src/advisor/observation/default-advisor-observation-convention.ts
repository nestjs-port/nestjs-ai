import assert from "node:assert/strict";
import {
	AiObservationAttributes,
	AiOperationType,
	AiProvider,
	KeyValue,
	ParsingUtils,
	SpringAiKind,
} from "@nestjs-ai/commons";

import type { AdvisorObservationContext } from "./advisor-observation-context";
import { AdvisorObservationConvention } from "./advisor-observation-convention";

export class DefaultAdvisorObservationConvention extends AdvisorObservationConvention {
	static readonly DEFAULT_NAME = "spring.ai.advisor";

	private readonly _name: string;

	constructor(name: string = DefaultAdvisorObservationConvention.DEFAULT_NAME) {
		super();
		this._name = name;
	}

	override getName(): string {
		return this._name;
	}

	override getContextualName(context: AdvisorObservationContext): string {
		assert(context, "context cannot be null");
		return ParsingUtils.reConcatenateCamelCase(context.advisorName, "_")
			.replace("_around_advisor", "")
			.replace("_advisor", "");
	}

	override getLowCardinalityKeyValues(
		context: AdvisorObservationContext,
	): KeyValue[] {
		assert(context, "context cannot be null");
		return [
			this.aiOperationType(context),
			this.aiProvider(context),
			this.springAiKind(),
			this.advisorName(context),
		];
	}

	protected aiOperationType(_context: AdvisorObservationContext): KeyValue {
		return KeyValue.of(
			AiObservationAttributes.AI_OPERATION_TYPE.value,
			AiOperationType.FRAMEWORK.value,
		);
	}

	protected aiProvider(_context: AdvisorObservationContext): KeyValue {
		return KeyValue.of(
			AiObservationAttributes.AI_PROVIDER.value,
			AiProvider.SPRING_AI.value,
		);
	}

	protected springAiKind(): KeyValue {
		return KeyValue.of("spring.ai.kind", SpringAiKind.ADVISOR.value);
	}

	protected advisorName(context: AdvisorObservationContext): KeyValue {
		return KeyValue.of("spring.ai.advisor.name", context.advisorName);
	}

	override getHighCardinalityKeyValues(
		context: AdvisorObservationContext,
	): KeyValue[] {
		assert(context, "context cannot be null");
		return [this.advisorOrder(context)];
	}

	protected advisorOrder(context: AdvisorObservationContext): KeyValue {
		return KeyValue.of("spring.ai.advisor.order", `${context.order}`);
	}
}
