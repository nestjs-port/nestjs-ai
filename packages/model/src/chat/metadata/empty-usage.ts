import { Usage } from "./usage";

/**
 * An EmptyUsage implementation that returns zero for all property getters.
 */
export class EmptyUsage extends Usage {
  get promptTokens(): number {
    return 0;
  }

  get completionTokens(): number {
    return 0;
  }

  get nativeUsage(): unknown {
    return {};
  }
}
