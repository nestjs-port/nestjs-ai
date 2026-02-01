---
name: java-to-ts-migration
description: Migrate Spring AI Java files to NestJS AI TypeScript. Use when converting Java classes/interfaces from spring-ai to TypeScript in nestjs-ai, maintaining package structure and patterns.
argument-hint: <path-to-java-file>
---

# Java to TypeScript Migration Guide

This skill guides the migration of Java files from `spring-ai` to TypeScript in `nestjs-ai`.

## Usage

**Single File Migration Mode:**
- Migrate ONLY the specified Java file to TypeScript
- Do NOT migrate other files, even if they are related or referenced
- If the file depends on types/classes from other files that don't exist yet in TypeScript:
  - **Assume they already exist** and import them as if they were available
  - Use the expected TypeScript path based on the directory mapping below
  - Do NOT create stub files or placeholder implementations
- Focus solely on converting the given file's content

**Example:**
```
/java-to-ts-migration spring-ai-model/src/main/java/org/springframework/ai/chat/messages/UserMessage.java
```
This will migrate only `UserMessage.java`, assuming any dependencies like `AbstractMessage`, `Message` interface, etc. already exist.

## Additional Resources

For detailed patterns and examples, see:
- [Code Patterns](reference/code-patterns.md) - Interface, class, builder, enum conversions
- [Documentation Migration](reference/documentation.md) - Javadoc to JSDoc conversion
- [Test Migration](reference/test-migration.md) - JUnit to Vitest conversion

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

## Type Conversion Quick Reference

### Primitive Types

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

## Key Conversion Rules

### 1. Getters
- `getXxx()` methods → `get xxx(): Type` getters

### 2. Fields
- Prefix protected/private fields with `_` underscore
- Use `readonly` for immutable fields
- `public static final` → `static readonly`

### 3. Constructors
- Create `{ClassName}Props` interface for constructor parameters
- Use object destructuring with defaults

### 4. Assertions
- Replace `Assert.notNull()` with `assert()` from `node:assert/strict`

### 5. Collections
- Replace `new HashMap<>(map)` with spread operator `{ ...metadata }`
- Replace `new ArrayList<>(list)` with spread operator `[...list]`

### 6. toString
- `toString()` → `[Symbol.toPrimitive](): string`

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

## Migration Workflow

### Step 1: Identify Source Files
```bash
# Find the Java source file
ls spring-ai-model/src/main/java/org/springframework/ai/chat/messages/

# Find corresponding test file
ls spring-ai-model/src/test/java/org/springframework/ai/chat/messages/
```

### Step 2: Create Target Files
```bash
# Create TypeScript file in corresponding location
touch nestjs-ai/packages/model/src/chat/messages/new-message.ts

# Create test file
touch nestjs-ai/packages/model/src/chat/messages/__tests__/new-message.spec.ts
```

### Step 3: Convert Code
1. Convert imports (Java packages → TypeScript imports)
2. Convert class/interface declaration
3. Convert fields (apply `_` prefix, `readonly`)
4. Convert constructor (use Props interface pattern)
5. Convert methods (getters use `get` keyword)
6. Convert static methods (use `static` or namespace pattern)
7. Add `[Symbol.toPrimitive]` if `toString` exists

### Step 4: Update Index
Add exports to `index.ts`:
```typescript
export { NewMessage, type NewMessageProps } from "./new-message";
```

### Step 5: Migrate Documentation
1. Convert Javadoc to JSDoc (only for elements that have documentation)
2. Remove `@author` and `@since` tags
3. Convert `@return` → `@returns`, `@param <T>` → `@template T`
4. **Important:** Do NOT add JSDoc to elements that had no Javadoc

### Step 6: Convert Tests
1. Change `@Test` methods to `it()` blocks
2. Wrap in `describe()` block
3. Convert AssertJ assertions to Vitest expectations
4. Run tests: `npm test`

## Checklist

```
Migration Checklist:
- [ ] File created with kebab-case name
- [ ] Props interface defined (if class has constructor params)
- [ ] Fields prefixed with _ and marked readonly
- [ ] Getters use `get` keyword (not `getXxx()` methods)
- [ ] Static methods converted
- [ ] Builder pattern converted (Props or Builder class)
- [ ] toString → [Symbol.toPrimitive]
- [ ] Javadoc migrated to JSDoc (only for elements that had Javadoc)
- [ ] @author tags removed (not migrated)
- [ ] Imports use correct package paths
- [ ] Exported in index.ts
- [ ] Tests migrated to __tests__/*.spec.ts
- [ ] All tests pass
```
