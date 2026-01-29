---
name: java-to-ts-migration
description: Migrate Spring AI Java files to NestJS AI TypeScript. Use when converting Java classes/interfaces from spring-ai to TypeScript in nestjs-ai, maintaining package structure and patterns.
---

# Java to TypeScript Migration Guide

This skill guides the migration of Java files from `spring-ai` to TypeScript in `nestjs-ai`.

## Directory Structure Mapping

| Spring AI (Java)                                              | NestJS AI (TypeScript)                     |
|---------------------------------------------------------------|--------------------------------------------|
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

## Type Conversion Reference

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

## Code Patterns

### 1. Interface Conversion

**Java:**
```java
public interface Message extends Content {
    MessageType getMessageType();
}
```

**TypeScript:**
```typescript
import type { Content } from "@nestjs-ai/commons";
import type { MessageType } from "./message-type";

export interface Message extends Content {
    get messageType(): MessageType;
}
```

**Key differences:**
- Use `export interface` instead of `public interface`
- Convert `getXxx()` methods to `get xxx(): Type` getters
- Use `import type` for type-only imports
- Package imports use `@nestjs-ai/{package}` format

### 2. Abstract Class Conversion

**Java:**
```java
public abstract class AbstractMessage implements Message {
    public static final String MESSAGE_TYPE = "messageType";
    protected final MessageType messageType;
    protected final @Nullable String textContent;
    protected final Map<String, Object> metadata;

    protected AbstractMessage(MessageType messageType, @Nullable String textContent, 
                              Map<String, Object> metadata) {
        Assert.notNull(messageType, "Message type must not be null");
        this.messageType = messageType;
        this.textContent = textContent;
        this.metadata = new HashMap<>(metadata);
    }

    @Override
    public MessageType getMessageType() {
        return this.messageType;
    }
}
```

**TypeScript:**
```typescript
import assert from "node:assert/strict";
import type { Message } from "./message.interface";
import { MessageType } from "./message-type";

export abstract class AbstractMessage implements Message {
    static readonly MESSAGE_TYPE = "messageType";
    protected readonly _messageType: MessageType;
    protected readonly _textContent: string | null;
    protected readonly _metadata: Record<string, unknown>;

    protected constructor(
        messageType: MessageType,
        textContent: string | null,
        metadata: Record<string, unknown>,
    ) {
        assert(messageType, "Message type must not be null");
        this._messageType = messageType;
        this._textContent = textContent;
        this._metadata = { ...metadata };
    }

    get messageType(): MessageType {
        return this._messageType;
    }
}
```

**Key differences:**
- Use `static readonly` instead of `public static final`
- Prefix protected fields with `_` underscore
- Use `readonly` for immutable fields
- Replace `Assert.notNull()` with `assert()` from `node:assert/strict`
- Replace `new HashMap<>(map)` with spread operator `{ ...metadata }`

### 3. Concrete Class with Props Interface

**Java:**
```java
public class UserMessage extends AbstractMessage implements MediaContent {
    protected final List<Media> media;

    public UserMessage(@Nullable String textContent) {
        this(textContent, new ArrayList<>(), Map.of());
    }

    private UserMessage(@Nullable String textContent, Collection<Media> media, 
                        Map<String, Object> metadata) {
        super(MessageType.USER, textContent, metadata);
        this.media = new ArrayList<>(media);
    }

    @Override
    public List<Media> getMedia() {
        return this.media;
    }

    public UserMessage copy() {
        return mutate().build();
    }
}
```

**TypeScript:**
```typescript
import type { Media, MediaContent } from "@nestjs-ai/commons";
import { AbstractMessage } from "./abstract-message";
import { MessageType } from "./message-type";

export interface UserMessageProps {
    content?: string | null;
    properties?: Record<string, unknown>;
    media?: Media[];
}

export class UserMessage extends AbstractMessage implements MediaContent {
    protected readonly _media: Media[];

    constructor(options: UserMessageProps = {}) {
        super(MessageType.USER, options.content ?? null, options.properties ?? {});
        this._media = [...(options.media ?? [])];
    }

    static of(textContent: string): UserMessage {
        return new UserMessage({ content: textContent, media: [] });
    }

    get media(): Media[] {
        return this._media;
    }

    copy(): UserMessage {
        return new UserMessage({
            content: this.text,
            properties: { ...this.metadata },
            media: [...this._media],
        });
    }
}
```

**Key differences:**
- Create `{ClassName}Props` interface for constructor parameters
- Use object destructuring with defaults
- Replace factory methods with `static of()` or similar patterns
- Replace Builder pattern with Props interface (simpler for TS)

### 4. Builder Pattern Conversion

**Java Builder:**
```java
public static Builder builder() {
    return new Builder();
}

public static final class Builder {
    private @Nullable String text;
    private List<Media> media = new ArrayList<>();

    public Builder text(String text) {
        this.text = text;
        return this;
    }

    public Builder media(List<Media> media) {
        this.media = media;
        return this;
    }

    public UserMessage build() {
        return new UserMessage(this.text, this.media, this.metadata);
    }
}
```

**TypeScript (Option A - Props Interface):**
```typescript
export interface UserMessageProps {
    content?: string | null;
    media?: Media[];
    properties?: Record<string, unknown>;
}

export class UserMessage {
    constructor(options: UserMessageProps = {}) {
        // ...
    }
}

// Usage: new UserMessage({ content: "Hello", media: [] })
```

**TypeScript (Option B - Fluent Builder when needed):**
```typescript
export class ChatResponseBuilder {
    private _generations: Generation[] | null = null;

    from(other: ChatResponse): this {
        this._generations = other.results;
        return this;
    }

    generations(generations: Generation[]): this {
        this._generations = generations;
        return this;
    }

    build(): ChatResponse {
        assert(this._generations !== null, "'generations' must not be null");
        return new ChatResponse({ generations: this._generations });
    }
}

// Usage: ChatResponse.builder().generations([gen]).build()
```

**Guideline:** Prefer Props interface for simpler cases. Use Builder class when chaining is important.

### 5. Enum Conversion

**Java:**
```java
public enum MessageType {
    USER, ASSISTANT, SYSTEM, TOOL
}
```

**TypeScript:**
```typescript
export enum MessageType {
    USER = "USER",
    ASSISTANT = "ASSISTANT",
    SYSTEM = "SYSTEM",
    TOOL = "TOOL",
}
```

**Note:** Always assign string values to enums for JSON serialization compatibility.

### 6. Interface with Static Methods (Namespace Pattern)

**Java:**
```java
public interface ToolDefinition {
    String name();
    String description();

    static DefaultToolDefinition.Builder builder() {
        return DefaultToolDefinition.builder();
    }
}
```

**TypeScript:**
```typescript
export interface ToolDefinition {
    readonly name: string;
    readonly description: string;
}

export namespace ToolDefinition {
    export function builder(): DefaultToolDefinitionBuilder {
        return DefaultToolDefinition.builder();
    }
}
```

### 7. toString Implementation

**Java:**
```java
@Override
public String toString() {
    return "UserMessage{" + "content='" + getText() + "'}";
}
```

**TypeScript:**
```typescript
[Symbol.toPrimitive](): string {
    return `UserMessage{content='${this.text}'}`;
}
```

## Documentation Migration (Javadoc → JSDoc)

### Important Rule: Preserve Documentation State

**Critical:** Only migrate documentation that exists in the Java source. If a Java class, method, field, or variable has no Javadoc, do NOT add JSDoc comments to the TypeScript equivalent. Maintain the same documentation coverage as the original Java code.

### Class/Interface Documentation

**Java:**
```java
/**
 * The Prompt class represents a prompt used in AI model requests. A prompt consists of
 * one or more messages and additional chat options.
 *
 * @author Mark Pollack
 * @author luocongqiu
 * @since 1.0.0
 */
public class Prompt implements ModelRequest<List<Message>> {
```

**TypeScript:**
```typescript
/**
 * The Prompt class represents a prompt used in AI model requests. A prompt consists of
 * one or more messages and additional chat options.
 */
export class Prompt implements ModelRequest<Message[]> {
```

**Key differences:**
- Remove `@author` tags (do not migrate)
- Remove `@since` tags (do not migrate)
- Remove `@param <T>` for generics (TypeScript generics are self-documenting)
- Convert `{@link ClassName}` to `{@link ClassName}` (same syntax)

### Method Documentation

**Java:**
```java
/**
 * Get the first system message in the prompt. If no system message is found, an empty
 * SystemMessage is returned.
 * @return a list of all system messages in the prompt
 */
public SystemMessage getSystemMessage() {
```

**TypeScript:**
```typescript
/**
 * Get the first system message in the prompt. If no system message is found, an empty
 * SystemMessage is returned.
 * @returns a list of all system messages in the prompt
 */
get systemMessage(): SystemMessage {
```

**Java with parameters:**
```java
/**
 * Constructor to initialize with the target type's class, a custom object mapper, and
 * a custom text cleaner.
 * @param clazz The target type's class.
 * @param objectMapper Custom object mapper for JSON operations.
 * @param textCleaner Custom text cleaner for preprocessing responses.
 */
public BeanOutputConverter(Class<T> clazz, @Nullable ObjectMapper objectMapper,
        @Nullable ResponseTextCleaner textCleaner) {
```

**TypeScript:**
```typescript
/**
 * Constructor to initialize with the target type's class, a custom object mapper, and
 * a custom text cleaner.
 * @param clazz - The target type's class.
 * @param objectMapper - Custom object mapper for JSON operations.
 * @param textCleaner - Custom text cleaner for preprocessing responses.
 */
constructor(
    clazz: Class<T>,
    objectMapper: ObjectMapper | null,
    textCleaner: ResponseTextCleaner | null,
) {
```

**Java with throws:**
```java
/**
 * Parses the given text to transform it to the desired target type.
 * @param text The LLM output in string format.
 * @return The parsed output in the desired target type.
 * @throws RuntimeException if JSON parsing fails
 */
public T convert(String text) {
```

**TypeScript:**
```typescript
/**
 * Parses the given text to transform it to the desired target type.
 * @param text - The LLM output in string format.
 * @returns The parsed output in the desired target type.
 * @throws {RuntimeError} if JSON parsing fails
 */
convert(text: string): T {
```

**Key differences:**
- `@return` → `@returns` (JSDoc uses `@returns`)
- `@param name description` → `@param name - description` (add dash separator)
- `@throws ExceptionType` → `@throws {ExceptionType}` (wrap in braces)
- Parameter names should match TypeScript parameter names (may differ from Java)

### Field Documentation

**Java:**
```java
/** The object mapper used for deserialization and other JSON operations. */
private final ObjectMapper objectMapper;

/** Holds the generated JSON schema for the target type. */
private String jsonSchema;
```

**TypeScript:**
```typescript
/** The object mapper used for deserialization and other JSON operations. */
private readonly _objectMapper: ObjectMapper;

/** Holds the generated JSON schema for the target type. */
private _jsonSchema: string;
```

**Note:** Field documentation is preserved as-is, adjusting for TypeScript naming conventions (e.g., `_` prefix for private fields).

### Generic Type Documentation

**Java:**
```java
/**
 * An implementation of StructuredOutputConverter that transforms the LLM output
 * to a specific object type using JSON schema.
 *
 * @param <T> The target type to which the output will be converted.
 */
public class BeanOutputConverter<T> {
```

**TypeScript:**
```typescript
/**
 * An implementation of StructuredOutputConverter that transforms the LLM output
 * to a specific object type using JSON schema.
 *
 * @template T The target type to which the output will be converted.
 */
export class BeanOutputConverter<T> {
```

**Key difference:** `@param <T>` → `@template T` (JSDoc uses `@template` for generics)

### HTML Tags in Documentation

**Java:**
```java
/**
 * Creates the default text cleaner that handles common response formats.
 * <p>
 * The default cleaner includes:
 * <ul>
 * <li>{@link ThinkingTagCleaner} - Removes thinking tags</li>
 * <li>{@link MarkdownCodeBlockCleaner} - Removes markdown code blocks</li>
 * </ul>
 * <p>
 * To customize, provide a custom {@link ResponseTextCleaner}.
 * @return a composite text cleaner
 */
```

**TypeScript:**
```typescript
/**
 * Creates the default text cleaner that handles common response formats.
 *
 * The default cleaner includes:
 * - {@link ThinkingTagCleaner} - Removes thinking tags
 * - {@link MarkdownCodeBlockCleaner} - Removes markdown code blocks
 *
 * To customize, provide a custom {@link ResponseTextCleaner}.
 * @returns a composite text cleaner
 */
```

**Key differences:**
- `<p>` → blank line (or remove, markdown handles spacing)
- `<ul><li>` → markdown list with `-` or `*`
- `{@link ClassName}` → keep as-is (JSDoc supports this)

### @see Tags

**Java:**
```java
/**
 * Tool callback provider that uses a static list of tool callbacks.
 * @see ToolCallbackProvider
 * @see ToolCallback
 */
public class StaticToolCallbackProvider {
```

**TypeScript:**
```typescript
/**
 * Tool callback provider that uses a static list of tool callbacks.
 * @see {@link ToolCallbackProvider}
 * @see {@link ToolCallback}
 */
export class StaticToolCallbackProvider {
```

**Key difference:** Wrap references in `{@link ...}` for consistency

### Examples: No Documentation → No Documentation

**Java (no Javadoc):**
```java
public String getContents() {
    StringBuilder sb = new StringBuilder();
    for (Message message : getInstructions()) {
        sb.append(message.getText());
    }
    return sb.toString();
}

@Override
public boolean equals(Object o) {
    // ...
}
```

**TypeScript (no JSDoc - correct):**
```typescript
get contents(): string {
    let sb = "";
    for (const message of this.instructions) {
        sb += message.text;
    }
    return sb;
}

equals(o: unknown): boolean {
    // ...
}
```

**TypeScript (with JSDoc - incorrect):**
```typescript
/**
 * Gets the contents.
 * @returns the contents
 */
get contents(): string {
    // DON'T DO THIS - Java had no Javadoc!
}
```

### Documentation Tag Reference

| Javadoc Tag          | JSDoc Tag              | Notes                                    |
|----------------------|------------------------|------------------------------------------|
| `@param name desc`   | `@param name - desc`   | Add dash separator                       |
| `@return desc`       | `@returns desc`        | Use `@returns` (plural)                  |
| `@throws Type desc`  | `@throws {Type} desc`  | Wrap exception type in braces            |
| `@param <T> desc`    | `@template T desc`     | Use `@template` for generics             |
| `@author name`       | *(remove)*             | Do not migrate                           |
| `@since version`     | *(remove)*             | Do not migrate                           |
| `@see Class`         | `@see {@link Class}`   | Wrap in `{@link}`                        |
| `@deprecated`        | `@deprecated`          | Keep as-is                               |

## Test Migration

### Critical Rules

1. **Preserve test structure exactly**: Do NOT nest `describe` blocks unless Java has nested test classes
2. **Preserve test case names**: Convert Java method names to space-separated words only (no "should" prefix, no rephrasing)
3. **Do NOT add tests**: Only migrate existing tests. Do not create additional test cases

### Test Case Name Conversion

| Java Method Name                                              | TypeScript it() Name                                              |
|---------------------------------------------------------------|-------------------------------------------------------------------|
| `parseTimeAsDurationWithDaysHoursMinutesSeconds`              | `"parse time as duration with days hours minutes seconds"`        |
| `userMessageWithNullText`                                     | `"user message with null text"`                                   |
| `testSerializationWithAllFields`                              | `"test serialization with all fields"`                            |

**Rule:** Split camelCase at capital letters, lowercase all words, join with single spaces. Do NOT:
- Add "should" prefix
- Rephrase or "improve" the description
- Change the meaning or structure

### JUnit → Vitest Structure

**Java (JUnit):**
```java
class UserMessageTests {
    @Test
    void userMessageWithNullText() {
        assertThatThrownBy(() -> new UserMessage((String) null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Content must not be null");
    }

    @Test
    void userMessageWithTextContent() {
        String text = "Hello, world!";
        UserMessage message = new UserMessage(text);
        assertThat(message.getText()).isEqualTo(text);
        assertThat(message.getMedia()).isEmpty();
    }
}
```

**TypeScript (Vitest):**
```typescript
import { describe, expect, it } from "vitest";
import { UserMessage } from "../user-message";

describe("UserMessage", () => {
    it("user message with null text", () => {
        expect(() => new UserMessage({ content: null as unknown as string }))
            .toThrow("Content must not be null");
    });

    it("user message with text content", () => {
        const text = "Hello, world!";
        const message = new UserMessage({ content: text });
        expect(message.text).toBe(text);
        expect(message.media).toHaveLength(0);
    });
});
```

**Key points:**
- One `describe()` block per Java test class (class name without "Tests" suffix)
- One `it()` block per `@Test` method
- Test name = Java method name converted to space-separated words
- Do NOT nest `describe()` unless Java has `@Nested` classes

### Assertion Mapping

| AssertJ (Java)                        | Vitest (TypeScript)                     |
|---------------------------------------|-----------------------------------------|
| `assertThat(x).isEqualTo(y)`          | `expect(x).toBe(y)`                     |
| `assertThat(x).isNotEqualTo(y)`       | `expect(x).not.toBe(y)`                 |
| `assertThat(list).isEmpty()`          | `expect(list).toHaveLength(0)`          |
| `assertThat(list).hasSize(n)`         | `expect(list).toHaveLength(n)`          |
| `assertThat(obj).isNull()`            | `expect(obj).toBeNull()`                |
| `assertThat(obj).isNotNull()`         | `expect(obj).not.toBeNull()`            |
| `assertThat(map).containsEntry(k, v)` | `expect(obj).toHaveProperty(k, v)`      |
| `assertThatThrownBy(() -> ...).isInstanceOf(...)` | `expect(() => ...).toThrow(...)` |

## Import/Export Patterns

### Index Files

Each directory should have an `index.ts` that re-exports public APIs:

```typescript
// src/chat/messages/index.ts
export { AbstractMessage } from "./abstract-message";
export { UserMessage, type UserMessageProps } from "./user-message";
export { SystemMessage, type SystemMessageProps } from "./system-message";
export type { Message } from "./message.interface";
export { MessageType } from "./message-type";
```

**Guidelines:**
- Export types with `export type { ... }` when they're only used as types
- Export interfaces from `.interface.ts` files as types
- Export implementation classes and Props interfaces together

### Package Imports

```typescript
// Cross-package imports use @nestjs-ai scope
import type { Content, Media } from "@nestjs-ai/commons";
import type { Model } from "@nestjs-ai/model";

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

1. Convert Javadoc to JSDoc for classes, methods, and fields that have documentation
2. Remove `@author` tags (do not migrate)
3. Convert `@return` → `@returns`, `@param <T>` → `@template T`
4. Add dash separator in `@param name - description`
5. Wrap exception types in `@throws {Type}`
6. **Important:** Do NOT add JSDoc to elements that had no Javadoc in Java

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
- [ ] @return → @returns, @param <T> → @template T
- [ ] Imports use correct package paths
- [ ] Exported in index.ts
- [ ] Tests migrated to __tests__/*.spec.ts
- [ ] All tests pass
```
