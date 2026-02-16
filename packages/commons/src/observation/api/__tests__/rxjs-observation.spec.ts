import { firstValueFrom, map, of } from "rxjs";
import { describe, expect, it } from "vitest";
import { AlsObservationRegistry } from "../als-observation-registry";
import type { KeyValue } from "../key-value";
import { ObservationContext } from "../observation-context";
import type { ObservationConvention } from "../observation-convention.interface";
import { withObservationScope } from "../rxjs-observation";
import { SimpleObservation } from "../simple-observation";

class TestConvention implements ObservationConvention<ObservationContext> {
	getName(): string {
		return "test.observation";
	}

	getContextualName(_context: ObservationContext): string {
		return "test contextual";
	}

	supportsContext(context: ObservationContext): context is ObservationContext {
		return context instanceof ObservationContext;
	}

	getLowCardinalityKeyValues(_context: ObservationContext): KeyValue[] {
		return [];
	}

	getHighCardinalityKeyValues(_context: ObservationContext): KeyValue[] {
		return [];
	}
}

describe("withObservationScope", () => {
	it("should expose current observation in rxjs chain", async () => {
		const registry = new AlsObservationRegistry();
		const observation = SimpleObservation.createNotStarted(
			null,
			new TestConvention(),
			() => new ObservationContext(),
			registry,
		);
		observation.start();
		const scope = observation.openScope();

		try {
			const actual = await firstValueFrom(
				of(1).pipe(
					withObservationScope(registry, scope),
					map(() => registry.currentObservation),
				),
			);
			expect(actual).toBe(observation);
		} finally {
			scope.close();
			observation.stop();
		}
	});

	it("should restore previous scope after subscription", async () => {
		const registry = new AlsObservationRegistry();
		const observation = SimpleObservation.createNotStarted(
			null,
			new TestConvention(),
			() => new ObservationContext(),
			registry,
		);
		observation.start();
		const scope = observation.openScope();

		try {
			await firstValueFrom(of(1).pipe(withObservationScope(registry, scope)));
		} finally {
			scope.close();
			observation.stop();
		}

		expect(registry.currentObservation).toBeNull();
	});
});
