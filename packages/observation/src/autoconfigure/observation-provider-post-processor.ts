import type { OnApplicationBootstrap } from "@nestjs/common";
import type {
  ObservationHandlers,
  ObservationRegistry,
} from "@nestjs-ai/commons";

export class ObservationProviderPostProcessor
  implements OnApplicationBootstrap
{
  constructor(
    private readonly registry: ObservationRegistry,
    private readonly observationHandlers: ObservationHandlers,
  ) {}

  onApplicationBootstrap(): void {
    for (const handler of this.observationHandlers.handlers) {
      this.registry.addHandler(handler);
    }
  }
}
