import { firstValueFrom, map, of, throwError } from "rxjs";
import { describe, expect, it } from "vitest";
import { AlsObservationRegistry } from "../als-observation-registry";
import { KeyValue } from "../key-value";
import { ObservationContext } from "../observation-context";
import type { ObservationConvention } from "../observation-convention.interface";
import type { ObservationHandler } from "../observation-handler.interface";
import type { ObservationScope } from "../observation-scope.interface";
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
    return [KeyValue.of("low", "1")];
  }

  getHighCardinalityKeyValues(_context: ObservationContext): KeyValue[] {
    return [KeyValue.of("high", "2")];
  }
}

function createObservation(
  registry: AlsObservationRegistry,
  context: ObservationContext = new ObservationContext(),
) {
  return SimpleObservation.createNotStarted(
    null,
    new TestConvention(),
    () => context,
    registry,
  );
}

function createDummyScope(
  previousObservationScope: ObservationScope | null = null,
): ObservationScope {
  return {
    currentObservation: null as never,
    previousObservationScope,
    close() {},
  };
}

describe("Observation", () => {
  it("should populate convention values on start and stop", () => {
    const registry = new AlsObservationRegistry();
    const context = new ObservationContext();
    const observation = createObservation(registry, context);

    observation.start();
    expect(context.name).toBe("test.observation");
    expect(context.contextualName).toBe("test contextual");
    expect(context.lowCardinalityKeyValues.get("low")).toBe("1");

    observation.stop();
    expect(context.highCardinalityKeyValues.get("high")).toBe("2");
  });

  it("should call lifecycle handlers and restore scope on observe", async () => {
    const registry = new AlsObservationRegistry();
    const calls: string[] = [];

    const handler: ObservationHandler<ObservationContext> = {
      supportsContext(context): context is ObservationContext {
        return context instanceof ObservationContext;
      },
      onStart() {
        calls.push("start");
      },
      onScopeOpened() {
        calls.push("scope-opened");
      },
      onScopeClosed() {
        calls.push("scope-closed");
      },
      onStop() {
        calls.push("stop");
      },
    };

    registry.addHandler(handler);
    const observation = createObservation(registry);

    await observation.observe(async () => {
      expect(registry.currentObservation).toBe(observation);
      await Promise.resolve();
      expect(registry.currentObservation).toBe(observation);
    });

    expect(calls).toEqual(["start", "scope-opened", "scope-closed", "stop"]);
  });

  it("should call error handler when observe callback throws", async () => {
    const registry = new AlsObservationRegistry();
    const calls: string[] = [];

    const handler: ObservationHandler<ObservationContext> = {
      supportsContext(context): context is ObservationContext {
        return context instanceof ObservationContext;
      },
      onStart() {
        calls.push("start");
      },
      onError() {
        calls.push("error");
      },
      onScopeClosed() {
        calls.push("scope-closed");
      },
      onStop() {
        calls.push("stop");
      },
    };

    registry.addHandler(handler);
    const observation = createObservation(registry);

    await expect(
      observation.observe(async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    expect(calls).toEqual(["start", "error", "scope-closed", "stop"]);
    expect(observation.context.error?.message).toBe("boom");
  });

  it("should execute observation callback through handler runInScope", async () => {
    const registry = new AlsObservationRegistry();
    const calls: string[] = [];

    const handler: ObservationHandler<ObservationContext> = {
      supportsContext(context): context is ObservationContext {
        return context instanceof ObservationContext;
      },
      async runInScope(_context, fn) {
        calls.push("run-scope-enter");
        try {
          return await fn();
        } finally {
          calls.push("run-scope-exit");
        }
      },
    };

    registry.addHandler(handler);
    const observation = createObservation(registry);

    await observation.observe(async () => {
      calls.push("callback");
    });

    expect(calls).toEqual(["run-scope-enter", "callback", "run-scope-exit"]);
  });

  it("should call lifecycle handlers and restore scope on observeStream", async () => {
    const registry = new AlsObservationRegistry();
    const calls: string[] = [];

    const handler: ObservationHandler<ObservationContext> = {
      supportsContext(context): context is ObservationContext {
        return context instanceof ObservationContext;
      },
      onStart() {
        calls.push("start");
      },
      onScopeOpened() {
        calls.push("scope-opened");
      },
      onScopeClosed() {
        calls.push("scope-closed");
      },
      onStop() {
        calls.push("stop");
      },
    };

    registry.addHandler(handler);
    const observation = createObservation(registry);

    const actual = await firstValueFrom(
      observation.observeStream(() =>
        of(1).pipe(map(() => registry.currentObservation)),
      ),
    );

    expect(actual).toBe(observation);
    expect(calls).toEqual(["start", "scope-opened", "scope-closed", "stop"]);
  });

  it("should call error handler when observeStream source errors", async () => {
    const registry = new AlsObservationRegistry();
    const calls: string[] = [];

    const handler: ObservationHandler<ObservationContext> = {
      supportsContext(context): context is ObservationContext {
        return context instanceof ObservationContext;
      },
      onStart() {
        calls.push("start");
      },
      onError() {
        calls.push("error");
      },
      onScopeClosed() {
        calls.push("scope-closed");
      },
      onStop() {
        calls.push("stop");
      },
    };

    registry.addHandler(handler);
    const observation = createObservation(registry);

    await expect(
      firstValueFrom(
        observation.observeStream(() =>
          throwError(() => new Error("stream boom")),
        ),
      ),
    ).rejects.toThrow("stream boom");

    expect(calls).toEqual(["start", "error", "scope-closed", "stop"]);
    expect(observation.context.error?.message).toBe("stream boom");
  });

  it("should restore parent observation scope after observeStream subscription", async () => {
    const registry = new AlsObservationRegistry();
    const parent = createObservation(registry);
    const child = createObservation(registry);

    await registry.runInScope(createDummyScope(), async () => {
      parent.start();
      const parentScope = parent.openScope();
      expect(registry.currentObservation).toBe(parent);

      await firstValueFrom(child.observeStream(() => of(1)));
      expect(registry.currentObservation).toBe(parent);

      parentScope.close();
      parent.stop();
      expect(registry.currentObservation).toBeNull();
    });
  });

  it("should restore parent observation scope when nested", async () => {
    const registry = new AlsObservationRegistry();
    const parent = createObservation(registry);
    const child = createObservation(registry);

    const initialScope = createDummyScope();
    await registry.runInScope(initialScope, async () => {
      await parent.observe(async () => {
        expect(registry.currentObservation).toBe(parent);
        const parentScope = registry.currentObservationScope;

        await child.observe(async () => {
          expect(registry.currentObservation).toBe(child);
          expect(registry.currentObservationScope).not.toBe(parentScope);
          expect(
            registry.currentObservationScope?.previousObservationScope,
          ).toBe(parentScope);
        });

        expect(registry.currentObservation).toBe(parent);
        expect(registry.currentObservationScope).toBe(parentScope);
        expect(registry.currentObservationScope?.previousObservationScope).toBe(
          initialScope,
        );
      });
      expect(registry.currentObservation).toBeNull();
    });
  });
});
