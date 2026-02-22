---
name: java-to-ts-migration
description: Migrate Spring AI Java source or test files into equivalent NestJS AI TypeScript files while preserving behavior and module structure. Use when asked to convert specific Java classes, interfaces, enums, or JUnit tests from `spring-ai` to `nestjs-ai`, especially single-file migrations that assume dependent TypeScript files already exist.
---

# Java To TypeScript Migration

Migrate Java files from `spring-ai` to TypeScript in `nestjs-ai`.
Convert only requested files unless explicitly told to perform a batch migration.

## Workflow

1. Confirm migration scope.
Convert only the explicitly requested file.
If the file references missing TypeScript dependencies, assume they already exist and import by expected path.
Do not create stub files unless the user asks.

2. Map source path to target path.
Use the mapping table below to choose target package and output location.
Use kebab-case file names in TypeScript.

3. Convert implementation semantics.
Preserve behavior and API intent, not Java syntax.
Apply the conversion rules in this file, then pull detailed examples from `reference/code-patterns.md` when needed.

4. Convert tests when the input is a test file.
Use `reference/test-migration.md` for JUnit-to-Vitest mapping and naming constraints.
Do not add new tests that did not exist in Java.
Copy Java test-method inline comments verbatim into the matching TypeScript `it()` block.
Preserve comment wording and relative placement.
For multi-line inline comments, preserve line splitting and order.

5. Export surface updates.
If the migrated file is part of public module surface, update the closest `index.ts` barrel export.
Keep export style consistent with neighboring files.

## Directory Structure Mapping

| Spring AI (Java)                                              | NestJS AI (TypeScript)                     |
|---------------------------------------------------------------|-----------------------------------------------|
| `spring-ai-model/src/main/java/org/springframework/ai/chat/`  | `nestjs-ai/packages/model/src/chat/`       |
| `spring-ai-model/src/main/java/org/springframework/ai/model/` | `nestjs-ai/packages/model/src/model/`      |
| `spring-ai-model/src/main/java/org/springframework/ai/tool/`  | `nestjs-ai/packages/model/src/tool/`       |
| `spring-ai-commons/src/main/java/org/springframework/ai/content/` | `nestjs-ai/packages/commons/src/content/` |
| `models/spring-ai-openai/`                                    | `nestjs-ai/packages/models/openai/`        |
| `models/spring-ai-{provider}/`                                | `nestjs-ai/packages/models/{provider}/`    |

### Test File Mapping

| Java Test Location                     | TypeScript Test Location        |
|----------------------------------------|---------------------------------|
| `src/test/java/.../FooTests.java`      | `src/.../__tests__/foo.spec.ts` |

## File Naming Conventions

| Java Pattern              | TypeScript Pattern                    |
|---------------------------|---------------------------------------|
| `FooBar.java` (class)     | `foo-bar.ts` (kebab-case)             |
| `FooBar.java` (interface) | `foo-bar.interface.ts` or `foo-bar.ts`|
| `FooBarTests.java`        | `__tests__/foo-bar.spec.ts`           |

## Conversion Rules

### Type Mapping

| Java                      | TypeScript                            |
|---------------------------|---------------------------------------|
| `String`                  | `string`                              |
| `int`, `long`, `Integer`  | `number`                              |
| `boolean`, `Boolean`      | `boolean`                             |
| `void`                    | `void`                                |
| `Object`                  | `unknown`                             |
| `@Nullable T`             | `T \| null`                           |

### Collection Types

| Java                      | TypeScript                            |
|---------------------------|---------------------------------------|
| `List<T>`                 | `T[]`                                 |
| `Set<T>`                  | `Set<T>`                              |
| `Map<K, V>`               | `Map<K, V>` or `Record<K, V>`         |
| `Map<String, Object>`     | `Record<string, unknown>`             |

### Special Types

| Java                      | TypeScript                            |
|---------------------------|---------------------------------------|
| `Flux<T>`                 | `Observable<T>` (from rxjs)           |
| `Mono<T>`                 | `Promise<T>`                          |
| `Resource`                | Remove (Spring-specific)              |

### Structure And API Rules

1. Convert `getXxx()` methods to TypeScript getters (`get xxx(): Type`).
2. Prefix protected/private fields with `_` and add `readonly` where immutability is intended.
3. Convert `public static final` constants to `static readonly`.
4. Prefer `{ClassName}Props` constructor interfaces with object options over overloaded Java constructors.
5. Replace `Assert.notNull(...)` with `assert(...)` from `node:assert/strict`.
6. Replace Java copy constructors (`new HashMap<>(x)`, `new ArrayList<>(x)`) with spread copies.
7. Convert Java interfaces with `static` or `default` methods into TypeScript `abstract class`; keep plain interfaces as `interface`.

## Import/Export Patterns

### Index Files

Each directory should have an `index.ts` that re-exports public APIs:

```typescript
// src/chat/messages/index.ts
export { AbstractMessage } from "./abstract-message";
export { UserMessage, type UserMessageProps } from "./user-message";
export type { Message } from "./message.interface";
export { MessageType } from "./message-type";
```

### Package Imports

```typescript
// Cross-package imports use @nestjs-ai scope
import type { Content, Media } from "@nestjs-ai/commons";

// Same-package imports use relative paths
import { AbstractMessage } from "./abstract-message";
import type { Message } from "./message.interface";
```

## Comments Handling

Do not migrate Javadoc or license headers.
Preserve meaningful inline implementation comments inside method/function bodies.
For test files, comments inside Java test methods MUST be copied verbatim into the corresponding TypeScript test body.
Do not paraphrase, summarize, or omit Java method-body comments.

## Reference Files

- Use `reference/code-patterns.md` for concrete class/interface/builder conversions.
- Use `reference/test-migration.md` for JUnit-to-Vitest rules, especially naming and structure constraints.

## Checklist

```
Migration Checklist:
- [ ] Convert only requested file(s)
- [ ] Map to correct `nestjs-ai` package path
- [ ] Apply kebab-case file naming
- [ ] Preserve behavior and public API intent
- [ ] Apply getter/field/constructor conversion rules
- [ ] Keep imports and barrel exports consistent
- [ ] Omit Javadoc and license headers
- [ ] Preserve meaningful inline implementation comments
- [ ] For tests, keep case names/structure aligned with source JUnit tests
- [ ] Test-method inline comments copied verbatim and kept in matching locations
- [ ] No Java method-body comment was paraphrased or omitted
```
