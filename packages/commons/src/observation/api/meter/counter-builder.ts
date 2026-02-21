import type { Counter, MeterRegistry } from "./meter-registry.interface";
import { Tag } from "./tag";

/**
 * Builder for creating and registering a Counter.
 * Corresponds to Micrometer's Counter.builder() pattern.
 */
export class CounterBuilder {
  private readonly _tags: Tag[] = [];
  private _description?: string;

  constructor(private readonly _name: string) {}

  /**
   * Create a new CounterBuilder for the given metric name.
   */
  static builder(name: string): CounterBuilder {
    return new CounterBuilder(name);
  }

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
    return registry.counter(this._name, this._tags, this._description);
  }
}
