import { describe, expect, it } from "vitest";
import { AlsObservationRegistry } from "../als-observation-registry";
import type { KeyValue } from "../key-value";
import { ObservationContext } from "../observation-context";
import type { ObservationConvention } from "../observation-convention.interface";
import type { ObservationHandler } from "../observation-handler.interface";
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

function createObservation(registry: AlsObservationRegistry) {
  return SimpleObservation.createNotStarted(
    null,
    new TestConvention(),
    () => new ObservationContext(),
    registry,
  );
}

describe("AlsObservationRegistry", () => {
  it("should be non-noop with empty handlers and null current observation", () => {
    const registry = new AlsObservationRegistry();

    expect(registry.isNoop()).toBe(false);
    expect(registry.handlers).toHaveLength(0);
    expect(registry.currentObservationScope).toBeNull();
    expect(registry.currentObservation).toBeNull();
  });

  it("should add handlers to registry in order", () => {
    const registry = new AlsObservationRegistry();

    const handler1: ObservationHandler<ObservationContext> = {
      supportsContext(context): context is ObservationContext {
        return context instanceof ObservationContext;
      },
    };
    const handler2: ObservationHandler<ObservationContext> = {
      supportsContext(context): context is ObservationContext {
        return context instanceof ObservationContext;
      },
    };

    registry.addHandler(handler1);
    registry.addHandler(handler2);

    expect(registry.handlers).toEqual([handler1, handler2]);
  });

  it("opening and closing scope should set and clear current observation", () => {
    const registry = new AlsObservationRegistry();
    const observation = createObservation(registry).start();

    const scope = observation.openScope();
    expect(registry.currentObservation).toBe(observation);
    expect(registry.currentObservationScope).toBe(scope);

    scope.close();
    observation.stop();

    expect(registry.currentObservation).toBeNull();
    expect(registry.currentObservationScope).toBeNull();
  });

  it("should keep current scope in async flow via als", async () => {
    const registry = new AlsObservationRegistry();
    const observation = createObservation(registry).start();
    const scope = observation.openScope();

    await Promise.resolve();

    expect(registry.currentObservation).toBe(observation);
    expect(registry.currentObservationScope).toBe(scope);

    scope.close();
    observation.stop();
  });

  it("should run callback with provided scope across async boundaries", async () => {
    const registry = new AlsObservationRegistry();
    const observation = createObservation(registry).start();
    const scope = observation.openScope();
    scope.close();

    expect(registry.currentObservationScope).toBeNull();

    await registry.runInScope(scope, async () => {
      expect(registry.currentObservation).toBe(observation);
      await Promise.resolve();
      expect(registry.currentObservation).toBe(observation);
    });

    expect(registry.currentObservationScope).toBeNull();
    observation.stop();
  });
});
