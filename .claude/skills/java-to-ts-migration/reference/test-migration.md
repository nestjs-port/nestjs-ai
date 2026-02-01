# Test Migration (JUnit → Vitest)

## Critical Rules

1. **Preserve test structure exactly**: Do NOT nest `describe` blocks unless Java has nested test classes
2. **Preserve test case names**: Convert Java method names to space-separated words only (no "should" prefix, no rephrasing)
3. **Do NOT add tests**: Only migrate existing tests. Do not create additional test cases

## Test Case Name Conversion

| Java Method Name                                              | TypeScript it() Name                                              |
|---------------------------------------------------------------|-------------------------------------------------------------------|
| `parseTimeAsDurationWithDaysHoursMinutesSeconds`              | `"parse time as duration with days hours minutes seconds"`        |
| `userMessageWithNullText`                                     | `"user message with null text"`                                   |
| `testSerializationWithAllFields`                              | `"test serialization with all fields"`                            |

**Rule:** Split camelCase at capital letters, lowercase all words, join with single spaces. Do NOT:
- Add "should" prefix
- Rephrase or "improve" the description
- Change the meaning or structure

## JUnit → Vitest Structure

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

## Assertion Mapping

| AssertJ (Java)                        | Vitest (TypeScript)                     |
|---------------------------------------|-----------------------------------------|
| `assertThat(x).isEqualTo(y)`          | `expect(x).toBe(y)`                     |
| `assertThat(x).isNotEqualTo(y)`       | `expect(x).not.toBe(y)`                 |
| `assertThat(list).isEmpty()`          | `expect(list).toHaveLength(0)`          |
| `assertThat(list).hasSize(n)`         | `expect(list).toHaveLength(n)`          |
| `assertThat(obj).isNull()`            | `expect(obj).toBeNull()`                |
| `assertThat(obj).isNotNull()`         | `expect(obj).not.toBeNull()`            |
| `assertThat(bool).isTrue()`           | `expect(bool).toBe(true)`               |
| `assertThat(bool).isFalse()`          | `expect(bool).toBe(false)`              |
| `assertThat(map).containsEntry(k, v)` | `expect(obj).toHaveProperty(k, v)`      |
| `assertThat(list).contains(item)`     | `expect(list).toContain(item)`          |
| `assertThat(str).contains(sub)`       | `expect(str).toContain(sub)`            |
| `assertThat(str).startsWith(pre)`     | `expect(str.startsWith(pre)).toBe(true)`|
| `assertThatThrownBy(() -> ...).isInstanceOf(...)` | `expect(() => ...).toThrow(...)` |
| `assertThatThrownBy(...).hasMessageContaining(msg)` | `expect(() => ...).toThrow(msg)` |

## Nested Test Classes

**Java with @Nested:**
```java
class PromptTests {
    @Test
    void basicPromptTest() { /* ... */ }

    @Nested
    class ValidationTests {
        @Test
        void emptyMessagesThrows() { /* ... */ }
    }
}
```

**TypeScript:**
```typescript
describe("Prompt", () => {
    it("basic prompt test", () => { /* ... */ });

    describe("Validation", () => {
        it("empty messages throws", () => { /* ... */ });
    });
});
```

## @BeforeEach / @AfterEach

**Java:**
```java
class MyTests {
    private Service service;

    @BeforeEach
    void setUp() {
        service = new Service();
    }

    @AfterEach
    void tearDown() {
        service.close();
    }
}
```

**TypeScript:**
```typescript
import { afterEach, beforeEach, describe, it } from "vitest";

describe("My", () => {
    let service: Service;

    beforeEach(() => {
        service = new Service();
    });

    afterEach(() => {
        service.close();
    });
});
```

## Parameterized Tests

**Java:**
```java
@ParameterizedTest
@ValueSource(strings = {"hello", "world"})
void testWithValues(String value) {
    assertThat(value).isNotEmpty();
}
```

**TypeScript:**
```typescript
it.each(["hello", "world"])("test with values: %s", (value) => {
    expect(value.length).toBeGreaterThan(0);
});
```

## Object Comparison

**Java:**
```java
assertThat(actual).isEqualTo(expected);  // uses equals()
assertThat(actual).isSameAs(expected);   // uses ==
```

**TypeScript:**
```typescript
expect(actual).toEqual(expected);  // deep equality
expect(actual).toBe(expected);     // reference equality
```

Use `toEqual` for object comparison, `toBe` for primitives and reference checks.
