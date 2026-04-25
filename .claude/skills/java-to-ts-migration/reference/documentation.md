# Documentation Migration (Javadoc -> TypeScript Comments)

## Core Rule

Migrate only comments that are useful for implementation clarity in the target TS file.

Required behavior:
- Translate useful Java Javadocs into TypeScript JSDoc when the repository style calls for it.
- Copy the Java copyright line into the TypeScript file when present.
- Do not copy `@since` or `@author` tags into the TypeScript output.
- Do not copy the rest of the Java license header verbatim; use the standard `nestjs-ai` Apache header in migrated TypeScript files.
- Preserve inline comments inside method/function bodies when they explain logic.
- For test files, copy Java test-method inline comments verbatim into the matching Vitest test body.

## What to Drop

### 1) License Header

**Java (copy the copyright line, drop the rest):**
```java
/*
 * Copyright 2006-present the original author or authors.
 * Licensed under the Apache License, Version 2.0 (the "License");
 */
package org.springframework.batch.core;
```

**TypeScript (use the repo header instead):**
```typescript
/*
 * Copyright 2006-present the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
export class ExitStatus {
```

### 2) Class-Level Javadoc

**Java (drop):**
```java
/**
 * Value object used to carry information about the status of a job or step execution.
 */
public class ExitStatus {
```

**TypeScript (convert to JSDoc only when useful):**
```typescript
/**
 * Value object used to carry information about the status of a job or step execution.
 */
export class ExitStatus {
```

### 3) Method-Level Javadoc

**Java (drop):**
```java
/**
 * Getter for the exit code.
 */
public String getExitCode() {
```

**TypeScript (convert to JSDoc only when useful):**
```typescript
/**
 * Gets the exit code.
 */
get exitCode(): string {
```

## What to Keep

### Inline Comments in Method Body

**Java:**
```java
public @Nullable T read() {
    // Return null when all input data is exhausted
    if (list.isEmpty()) {
        return null;
    }
    return list.remove(0);
}
```

**TypeScript:**
```typescript
async read(): Promise<T | null> {
  // Return null when all input data is exhausted
  if (this._items.length === 0) {
    return null;
  }
  return this._items.shift() ?? null;
}
```

### Test-Method Inline Comments

Copy comments inside Java test methods directly into the matching Vitest test body.
Do not paraphrase or shorten them unless the surrounding code forces a structural change.

## Practical Guidance

- Prefer consistency with sibling files over literal Javadoc translation.
- If nearby files use TS JSDoc for public APIs, convert the useful Javadoc into JSDoc rather than dropping it.
- If nearby files already keep extensive TypeDoc, follow local style.
- If a comment explains non-obvious behavior, keep it even when the surrounding Javadoc is dropped.
