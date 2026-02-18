import { randomUUID } from "node:crypto";

import type { IdGenerator } from "./id-generator.interface";

export class RandomIdGenerator implements IdGenerator {
  generateId(..._contents: unknown[]): string {
    return randomUUID();
  }
}
