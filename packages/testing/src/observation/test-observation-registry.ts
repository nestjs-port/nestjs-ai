import {
	AlsObservationRegistry,
	type Observation,
	type ObservationContext,
	type ObservationHandler,
	type ObservationRegistry,
	type ObservationScope,
} from "@nestjs-ai/commons";

export enum TestObservationRegistryCapability {
	OBSERVATIONS_WITH_THE_SAME_NAME_SHOULD_HAVE_THE_SAME_SET_OF_LOW_CARDINALITY_KEYS = "OBSERVATIONS_WITH_THE_SAME_NAME_SHOULD_HAVE_THE_SAME_SET_OF_LOW_CARDINALITY_KEYS",
}

/**
 * Observation registry for tests that stores observed contexts and can run optional validation.
 */
export class TestObservationRegistry implements ObservationRegistry {
	private readonly delegate: ObservationRegistry = new AlsObservationRegistry();
	private readonly storingHandler = new StoringObservationHandler();

	constructor(
		private readonly capabilities: ReadonlySet<TestObservationRegistryCapability>,
	) {
		this.delegate.addHandler(this.storingHandler);

		if (
			this.capabilities.has(
				TestObservationRegistryCapability.OBSERVATIONS_WITH_THE_SAME_NAME_SHOULD_HAVE_THE_SAME_SET_OF_LOW_CARDINALITY_KEYS,
			)
		) {
			this.delegate.addHandler(
				new ObservationsLowCardinalityKeysValidatorHandler(),
			);
		}
	}

	static create(): TestObservationRegistry {
		return TestObservationRegistry.builder().build();
	}

	static builder(): TestObservationRegistryBuilder {
		return new TestObservationRegistryBuilder();
	}

	get handlers(): readonly ObservationHandler<ObservationContext>[] {
		return this.delegate.handlers;
	}

	addHandler(handler: ObservationHandler<ObservationContext>): void {
		this.delegate.addHandler(handler);
	}

	isNoop(): boolean {
		return this.delegate.isNoop();
	}

	get currentObservationScope(): ObservationScope | null {
		return this.delegate.currentObservationScope;
	}

	set currentObservationScope(scope: ObservationScope | null) {
		this.delegate.currentObservationScope = scope;
	}

	get currentObservation(): Observation<ObservationContext> | null {
		return this.delegate.currentObservation;
	}

	runInScope<T>(scope: ObservationScope | null, fn: () => T): T {
		return this.delegate.runInScope(scope, fn);
	}

	get contexts(): readonly TestObservationContext[] {
		return this.storingHandler.contexts;
	}

	clear(): void {
		this.storingHandler.clear();
	}
}

/**
 * Builder for {@link TestObservationRegistry}.
 */
export class TestObservationRegistryBuilder {
	private readonly capabilities = new Set<TestObservationRegistryCapability>(
		Object.values(TestObservationRegistryCapability),
	);

	validateObservationsWithTheSameNameHavingTheSameSetOfLowCardinalityKeys(
		flag: boolean,
	): this {
		const capability =
			TestObservationRegistryCapability.OBSERVATIONS_WITH_THE_SAME_NAME_SHOULD_HAVE_THE_SAME_SET_OF_LOW_CARDINALITY_KEYS;

		if (flag) {
			this.capabilities.add(capability);
		} else {
			this.capabilities.delete(capability);
		}

		return this;
	}

	build(): TestObservationRegistry {
		return new TestObservationRegistry(new Set(this.capabilities));
	}
}

export class TestObservationContext {
	private _observationStarted = false;
	private _observationStopped = false;

	constructor(private readonly _context: ObservationContext) {}

	get context(): ObservationContext {
		return this._context;
	}

	get isObservationStarted(): boolean {
		return this._observationStarted;
	}

	get isObservationStopped(): boolean {
		return this._observationStopped;
	}

	setObservationStarted(observationStarted: boolean): this {
		this._observationStarted = observationStarted;
		return this;
	}

	setObservationStopped(observationStopped: boolean): this {
		this._observationStopped = observationStopped;
		return this;
	}
}

class StoringObservationHandler
	implements ObservationHandler<ObservationContext>
{
	private readonly _contexts: TestObservationContext[] = [];

	get contexts(): readonly TestObservationContext[] {
		return this._contexts;
	}

	clear(): void {
		this._contexts.length = 0;
	}

	supportsContext(
		_context: ObservationContext,
	): _context is ObservationContext {
		return true;
	}

	onStart(context: ObservationContext): void {
		this._contexts.push(
			new TestObservationContext(context).setObservationStarted(true),
		);
	}

	onStop(context: ObservationContext): void {
		const testContext = this._contexts.find(
			(entry) => entry.context === context,
		);
		testContext?.setObservationStopped(true);
	}
}

class ObservationsLowCardinalityKeysValidatorHandler
	implements ObservationHandler<ObservationContext>
{
	private readonly lowCardinalityKeysByName = new Map<string, Set<string>>();

	supportsContext(
		_context: ObservationContext,
	): _context is ObservationContext {
		return true;
	}

	onStart(context: ObservationContext): void {
		const observationName = context.name;
		const currentKeys = new Set(context.lowCardinalityKeyValues.keys());
		const registeredKeys = this.lowCardinalityKeysByName.get(observationName);

		if (registeredKeys == null) {
			this.lowCardinalityKeysByName.set(observationName, currentKeys);
			return;
		}

		if (!isSameSet(registeredKeys, currentKeys)) {
			throw new Error(
				`Observation "${observationName}" must keep the same low cardinality key set. Expected [${[
					...registeredKeys,
				].join(", ")}], actual [${[...currentKeys].join(", ")}].`,
			);
		}
	}
}

function isSameSet(a: Set<string>, b: Set<string>): boolean {
	if (a.size !== b.size) {
		return false;
	}

	for (const value of a) {
		if (!b.has(value)) {
			return false;
		}
	}

	return true;
}
