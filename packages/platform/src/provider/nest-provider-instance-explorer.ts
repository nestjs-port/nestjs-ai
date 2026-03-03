import { Injectable } from "@nestjs/common";
import type { ModulesContainer } from "@nestjs/core";
import type { ProviderInstanceExplorer } from "@nestjs-ai/commons";

@Injectable()
export class NestProviderInstanceExplorer implements ProviderInstanceExplorer {
  constructor(private readonly modulesContainer: ModulesContainer) {}

  getProviderInstances(): object[] {
    const providerInstances: object[] = [];
    const seen = new Set<object>();

    for (const moduleRef of this.modulesContainer.values()) {
      const providers = moduleRef.providers;
      for (const providerWrapper of providers.values()) {
        const instance = providerWrapper.instance;
        if (instance == null || typeof instance !== "object") {
          continue;
        }
        if (seen.has(instance)) {
          continue;
        }
        seen.add(instance);
        providerInstances.push(instance);
      }
    }

    return providerInstances;
  }
}
