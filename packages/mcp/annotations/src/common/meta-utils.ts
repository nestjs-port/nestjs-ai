import type { MetaProvider } from "../context/meta-provider.js";

export type MetaProviderConstructor = new () => MetaProvider;

/**
 * Utility methods for working with `MetaProvider` metadata.
 *
 * This class instantiates the given provider type through a no-argument constructor
 * and returns its metadata as an immutable object.
 */
export abstract class MetaUtils {
  /** Not intended to be instantiated. */
  private constructor() {}

  /**
   * Instantiate the supplied `MetaProvider` type using a no-argument constructor
   * and return the metadata it supplies.
   *
   * The returned object is frozen to prevent external modification. If the provider
   * returns `null`, this method also returns `null`.
   */
  static getMeta(
    metaProviderClass: MetaProviderConstructor | null | undefined,
  ): Readonly<Record<string, unknown>> | null {
    if (metaProviderClass == null) {
      return null;
    }

    if (metaProviderClass.length > 0) {
      throw new Error(
        `Required no-arg constructor not found in ${metaProviderClass.name}`,
      );
    }

    try {
      const metaProvider = new metaProviderClass();
      const meta = metaProvider.getMeta();
      return meta == null ? null : Object.freeze({ ...meta });
    } catch (error) {
      throw new Error(`${metaProviderClass.name} instantiation failed`, {
        cause: error,
      });
    }
  }
}
