import type { MonoTypeOperatorFunction } from "rxjs";
import { Observable } from "rxjs";
import type { ObservationRegistry } from "./observation-registry.interface";
import type { ObservationScope } from "./observation-scope.interface";

/**
 * Runs an RxJS subscription inside an observation scope.
 * This is similar to writing context in Reactor.
 */
export function withObservationScope<T>(
	registry: ObservationRegistry,
	scope: ObservationScope | null,
): MonoTypeOperatorFunction<T> {
	return (source: Observable<T>) =>
		new Observable<T>((subscriber) => {
			try {
				return registry.runInScope(scope, () => source.subscribe(subscriber));
			} catch (error) {
				subscriber.error(error);
				return;
			}
		});
}
