import { describe, expect, it } from "vitest";
import { KeyValues } from "../../key-values";
import type {
  ObservationConvention,
  ObservationHandler,
  ObservationScope,
} from "../../observation";
import { ObservationContext, SimpleObservation } from "../../observation";
import { AlsObservationRegistry } from "../als-observation-registry";

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

  getLowCardinalityKeyValues(_context: ObservationContext): KeyValues {
    return KeyValues.empty();
  }

  getHighCardinalityKeyValues(_context: ObservationContext): KeyValues {
    return KeyValues.empty();
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
  function createDummyScope(
    previousObservationScope: ObservationScope | null = null,
  ): ObservationScope {
    return {
      currentObservation: null as never,
      previousObservationScope,
      close() {},
    };
  }

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
    const initialScope = createDummyScope();

    registry.runInScope(initialScope, () => {
      const scope = observation.openScope();
      expect(registry.currentObservation).toBe(observation);
      expect(registry.currentObservationScope).toBe(scope);

      scope.close();
      observation.stop();

      expect(registry.currentObservation).toBeNull();
      expect(registry.currentObservationScope).toBe(initialScope);
    });

    expect(registry.currentObservationScope).toBeNull();
  });

  it("should keep current scope in async flow via als", async () => {
    const registry = new AlsObservationRegistry();
    const observation = createObservation(registry).start();
    await registry.runInScope(createDummyScope(), async () => {
      const scope = observation.openScope();

      await Promise.resolve();

      expect(registry.currentObservation).toBe(observation);
      expect(registry.currentObservationScope).toBe(scope);

      scope.close();
      observation.stop();
    });
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

  it("should keep and restore current observation across nested runInScope calls", async () => {
    const registry = new AlsObservationRegistry();
    const outerObservation = createObservation(registry);

    const outerScope = outerObservation.openScope();
    await registry.runInScope(outerScope, async () => {
      expect(registry.currentObservationScope).toBe(outerScope);
      expect(
        registry.currentObservationScope?.previousObservationScope,
      ).toBeNull();

      const innerObservation = createObservation(registry);
      const innerScope = innerObservation.openScope();
      await registry.runInScope(innerScope, async () => {
        expect(registry.currentObservationScope).toBe(innerScope);
        expect(registry.currentObservationScope?.previousObservationScope).toBe(
          outerScope,
        );
        await Promise.resolve();
        expect(registry.currentObservationScope).toBe(innerScope);
        expect(registry.currentObservationScope?.previousObservationScope).toBe(
          outerScope,
        );
      });
      innerScope.close();
      innerObservation.stop();

      expect(registry.currentObservationScope).toBe(outerScope);
      expect(
        registry.currentObservationScope?.previousObservationScope,
      ).toBeNull();
    });
    outerScope.close();

    outerObservation.stop();
  });
});
