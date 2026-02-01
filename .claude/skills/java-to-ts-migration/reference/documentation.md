# Documentation Migration (Javadoc → JSDoc)

## Important Rule: Do NOT Migrate License Headers

**Critical:** Do NOT migrate the file-level license header comments from Java to TypeScript.

**Java (has license header - do NOT copy):**
```java
/*
 * Copyright 2023-2024 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * ...
 */

package org.springframework.ai.retry;
```

**TypeScript (correct - no license header):**
```typescript
/**
 * Root of the hierarchy of Model access exceptions...
 */
export class NonTransientAiException extends Error {
```

The license for the NestJS AI project is managed at the repository level, not per file.

## Important Rule: Preserve Documentation State

**Critical:** Only migrate documentation that exists in the Java source. If a Java class, method, field, or variable has no Javadoc, do NOT add JSDoc comments to the TypeScript equivalent.

## Class/Interface Documentation

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

## Method Documentation

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

## Field Documentation

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

## Generic Type Documentation

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

## HTML Tags in Documentation

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

## @see Tags

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

## No Documentation → No Documentation

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

**TypeScript (with JSDoc - INCORRECT):**
```typescript
/**
 * Gets the contents.
 * @returns the contents
 */
get contents(): string {
    // DON'T DO THIS - Java had no Javadoc!
}
```

## Documentation Tag Reference

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
