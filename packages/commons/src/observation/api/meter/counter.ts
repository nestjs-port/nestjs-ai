import { MeterId } from "./meter-id";
import type { MeterRegistry } from "./meter-registry.interface";
import { Tag } from "./tag";

/**
 * A counter metric that can be incremented.
 * Corresponds to Micrometer's Counter.
 */
export interface Counter {
  /**
   * Increment the counter by the given amount.
   *
   * @param amount - the amount to increment
   */
  increment(amount: number): void;
}

export class CounterBuilder {
  private readonly _tags: Tag[] = [];
  private _description?: string;

  constructor(private readonly _name: string) {}

  /**
   * Add a single tag.
   */
  tag(key: string, value: string): this {
    this._tags.push(Tag.of(key, value));
    return this;
  }

  /**
   * Add multiple tags.
   */
  tags(tags: Tag[]): this {
    this._tags.push(...tags);
    return this;
  }

  /**
   * Set the description.
   */
  description(description: string): this {
    this._description = description;
    return this;
  }

  /**
   * Register the counter with the given MeterRegistry and return it.
   */
  register(registry: MeterRegistry): Counter {
    return registry.counter(
      MeterId.of(this._name, [...this._tags], this._description),
    );
  }
}

export namespace Counter {
  /**
   * Create a new Builder for the given metric name.
   */
  export function builder(name: string): CounterBuilder {
    return new CounterBuilder(name);
  }
}
