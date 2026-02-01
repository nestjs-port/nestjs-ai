# Code Patterns Reference

Detailed examples for converting Java code patterns to TypeScript.

## 1. Interface Conversion

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

## 2. Abstract Class Conversion

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

## 3. Concrete Class with Props Interface

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

## 4. Builder Pattern Conversion

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

## 5. Enum Conversion

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

## 6. Interface with Static Methods (Namespace Pattern)

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

## 7. toString Implementation

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
