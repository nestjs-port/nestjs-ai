import { Usage } from "./usage";

export type DefaultUsageProps = Partial<Usage>;

/**
 * Default implementation of the {@link Usage} abstract class.
 */
export class DefaultUsage extends Usage {
	private readonly _promptTokens: number;
	private readonly _completionTokens: number;
	private readonly _totalTokens: number;
	private readonly _nativeUsage: unknown;

	/**
	 * Create a new DefaultUsage with promptTokens, completionTokens, totalTokens and
	 * native {@link Usage} object.
	 */
	constructor(props: DefaultUsageProps = {}) {
		super();
		this._promptTokens = props.promptTokens ?? 0;
		this._completionTokens = props.completionTokens ?? 0;
		this._totalTokens =
			props.totalTokens ?? this._promptTokens + this._completionTokens;
		this._nativeUsage = props.nativeUsage ?? null;
	}

	get promptTokens(): number {
		return this._promptTokens;
	}

	get completionTokens(): number {
		return this._completionTokens;
	}

	override get totalTokens(): number {
		return this._totalTokens;
	}

	get nativeUsage(): unknown {
		return this._nativeUsage;
	}

	toJson() {
		return {
			promptTokens: this._promptTokens,
			completionTokens: this._completionTokens,
			totalTokens: this._totalTokens,
			nativeUsage: this._nativeUsage,
		};
	}
}
