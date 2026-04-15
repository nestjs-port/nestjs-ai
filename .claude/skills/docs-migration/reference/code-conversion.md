# Code Conversion Patterns for Documentation

This file provides concrete before/after examples for converting Java code examples
in Spring AI documentation to TypeScript code examples for NestJS AI documentation.

## 1. Controller Pattern

### Before (Spring AI)

```java
@RestController
class MyController {

    private final ChatClient chatClient;

    public MyController(ChatClient.Builder chatClientBuilder) {
        this.chatClient = chatClientBuilder.build();
    }

    @GetMapping("/ai")
    String generation(@RequestParam String userInput) {
        return this.chatClient.prompt()
            .user(userInput)
            .call()
            .content();
    }
}
```

### After (NestJS AI)

```typescript
import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ChatClient } from '@nestjs-ai/client-chat';
import { CHAT_MODEL_TOKEN } from '@nestjs-ai/commons';
import type { ChatModel } from '@nestjs-ai/model';

@Controller()
export class MyController {
  private readonly chatClient: ChatClient;

  constructor(@Inject(CHAT_MODEL_TOKEN) chatModel: ChatModel) {
    this.chatClient = ChatClient.create(chatModel);
  }

  @Get('/ai')
  async generation(@Query('userInput') userInput: string): Promise<string | null> {
    return this.chatClient
      .prompt()
      .user(userInput)
      .call()
      .content();
  }
}
```

### Key differences
- `@RestController` → `@Controller` (from `@nestjs/common`)
- `@GetMapping` → `@Get` (from `@nestjs/common`)
- `@RequestParam` → `@Query` (from `@nestjs/common`)
- `ChatClient.Builder` injection → `ChatClient.create(chatModel)` factory method
- `ChatModel` injected via `@Inject(CHAT_MODEL_TOKEN)`
- Method returns `Promise<string | null>` (async)
- All methods that call AI models must be `async`

---

## 2. DI / Bean Configuration

### Before (Spring AI)

```java
@Configuration
class ChatConfig {

    @Bean
    ChatClient chatClient(ChatClient.Builder builder) {
        return builder
            .defaultSystem("You are a helpful assistant.")
            .build();
    }
}
```

### After (NestJS AI)

```typescript
import { Module } from '@nestjs/common';
import { NestAiModule } from '@nestjs-ai/platform';
import { OpenAiChatModelModule } from '@nestjs-ai/model-openai';
import { ChatClientModule } from '@nestjs-ai/client-chat';

@Module({
  imports: [
    NestAiModule.forRoot(),
    OpenAiChatModelModule.forFeatureAsync({
      useFactory: () => ({
        apiKey: process.env.OPENAI_API_KEY,
      }),
    }),
    ChatClientModule.forFeature({
      customizer: (builder) => {
        builder.defaultSystem('You are a helpful assistant.');
      },
    }),
  ],
})
export class AppModule {}
```

### Key differences
- `@Configuration` class → `@Module` decorator
- `@Bean` methods → entries in `imports` array (modules) or `providers` array (custom providers)
- `ChatClient.Builder` bean → `ChatClientModule.forFeature()` with `customizer`
- Chat model auto-config → explicit `OpenAiChatModelModule.forFeatureAsync()`
- `NestAiModule.forRoot()` must be imported first

---

## 3. ChatClient Usage Patterns

### Simple prompt call

#### Before
```java
String answer = chatClient.prompt()
    .user("Tell me a joke")
    .call()
    .content();
```

#### After
```typescript
const answer = await chatClient
  .prompt()
  .user('Tell me a joke')
  .call()
  .content();
```

### With system message

#### Before
```java
String answer = chatClient.prompt()
    .system("You are a comedian")
    .user("Tell me a joke")
    .call()
    .content();
```

#### After
```typescript
const answer = await chatClient
  .prompt()
  .system('You are a comedian')
  .user('Tell me a joke')
  .call()
  .content();
```

### With options

#### Before
```java
String answer = chatClient.prompt()
    .user("Tell me a joke")
    .options(ChatOptionsBuilder.builder()
        .withModel("gpt-4o")
        .withTemperature(0.7)
        .build())
    .call()
    .content();
```

#### After
```typescript
const answer = await chatClient
  .prompt()
  .user('Tell me a joke')
  .options((opts) => opts.model('gpt-4o').temperature(0.7))
  .call()
  .content();
```

---

## 4. ChatModel Direct Usage

### Before (Spring AI)

```java
@Autowired
ChatModel chatModel;

ChatResponse response = chatModel.call(
    new Prompt("Tell me a joke",
        OpenAiChatOptions.builder()
            .model("gpt-4o-mini")
            .temperature(0.4)
            .build()));
```

### After (NestJS AI)

```typescript
import { Inject } from '@nestjs/common';
import { CHAT_MODEL_TOKEN } from '@nestjs-ai/commons';
import type { ChatModel } from '@nestjs-ai/model';
import { Prompt } from '@nestjs-ai/model';
import { OpenAiChatOptions } from '@nestjs-ai/model-openai';

@Inject(CHAT_MODEL_TOKEN) private readonly chatModel: ChatModel;

const response = await this.chatModel.call(
  new Prompt('Tell me a joke',
    OpenAiChatOptions.builder()
      .model('gpt-4o-mini')
      .temperature(0.4)
      .build()));
```

---

## 5. Streaming Pattern

### Before (Spring AI)

```java
Flux<String> stream = chatClient.prompt()
    .user("Tell me a story")
    .stream()
    .content();
```

### After (NestJS AI)

```typescript
import { Observable } from 'rxjs';

const stream: Observable<string> = chatClient
  .prompt()
  .user('Tell me a story')
  .stream()
  .content();

// Subscribe to the stream
stream.subscribe({
  next: (chunk) => console.log(chunk),
  complete: () => console.log('Done'),
});
```

### Key differences
- `Flux<String>` → `Observable<string>` (from `rxjs`)
- `Mono<T>` → `Promise<T>`
- Subscription model is similar but uses RxJS API

---

## 6. Module Setup — Chat Model

### Before (Spring AI — auto-configuration)

```properties
spring.ai.openai.api-key=${OPENAI_API_KEY}
spring.ai.openai.chat.options.model=gpt-4o-mini
spring.ai.openai.chat.options.temperature=0.7
```

### After (NestJS AI — module configuration)

```typescript
import { Module } from '@nestjs/common';
import { NestAiModule } from '@nestjs-ai/platform';
import { OpenAiChatModelModule } from '@nestjs-ai/model-openai';

@Module({
  imports: [
    NestAiModule.forRoot(),
    OpenAiChatModelModule.forFeatureAsync({
      useFactory: () => ({
        apiKey: process.env.OPENAI_API_KEY,
        options: {
          model: 'gpt-4o-mini',
          temperature: 0.7,
        },
      }),
    }),
  ],
})
export class AppModule {}
```

---

## 7. Module Setup — Vector Store

### Before (Spring AI — auto-configuration)

```properties
spring.ai.vectorstore.redis.uri=redis://localhost:6379
spring.ai.vectorstore.redis.index=my-index
spring.ai.vectorstore.redis.initialize-schema=true
```

### After (NestJS AI — module configuration)

```typescript
import { Module } from '@nestjs/common';
import { NestAiModule } from '@nestjs-ai/platform';
import { TransformersEmbeddingModelModule } from '@nestjs-ai/model-transformers';
import { RedisVectorStoreModule } from '@nestjs-ai/vector-store-redis';

@Module({
  imports: [
    NestAiModule.forRoot(),
    // Embedding model is required for vector store
    TransformersEmbeddingModelModule.forFeature({}, { global: true }),
    RedisVectorStoreModule.forFeature({
      clientOptions: { url: 'redis://localhost:6379' },
      indexName: 'my-index',
      initializeSchema: true,
    }),
  ],
})
export class AppModule {}
```

### Key differences
- Vector store requires an embedding model to be registered first
- `TransformersEmbeddingModelModule` should be `global: true` so the vector store can find `EMBEDDING_MODEL_TOKEN`
- Redis connection uses `clientOptions` object, not a URI string in properties

---

## 8. Module Setup — Chat Memory

### Before (Spring AI — auto-configuration)

```properties
spring.ai.chat.memory.repository.jdbc.initialize-schema=true
```

### After (NestJS AI — module configuration)

```typescript
import { Module } from '@nestjs/common';
import { JsdbcChatMemoryRepositoryModule } from '@nestjs-ai/model-chat-memory-repository-jsdbc';

@Module({
  imports: [
    // ORM module must be imported (e.g., TypeORM, Prisma, MikroORM, or Sequelize)
    JsdbcChatMemoryRepositoryModule.forFeature({
      initializeSchema: true,
    }),
  ],
})
export class MemoryModule {}
```

---

## 9. Module Setup — Observation

### Before (Spring AI — auto-configuration)

```properties
spring.ai.chat.observations.include-completion=true
spring.ai.chat.observations.include-prompt=true
```

### After (NestJS AI — module configuration)

```typescript
import { Module } from '@nestjs/common';
import { ObservationModule } from '@nestjs-ai/observation';

@Module({
  imports: [
    ObservationModule.forRoot({
      tracer: myOpenTelemetryTracer, // optional
      meter: myOpenTelemetryMeter,   // optional
    }),
  ],
})
export class AppModule {}
```

---

## 10. Structured Output

### Before (Spring AI)

```java
record ActorFilms(String actor, List<String> movies) {}

ActorFilms films = chatClient.prompt()
    .user("Generate filmography for Tom Hanks")
    .call()
    .entity(ActorFilms.class);
```

### After (NestJS AI)

```typescript
interface ActorFilms {
  actor: string;
  movies: string[];
}

const films = await chatClient
  .prompt()
  .user('Generate filmography for Tom Hanks')
  .call()
  .entity<ActorFilms>();
```

---

## 11. Tool / Function Calling

### Before (Spring AI)

```java
@Bean
@Description("Get the weather in a location")
public Function<WeatherRequest, WeatherResponse> currentWeather() {
    return request -> new WeatherResponse(request.location(), 72.0, "sunny");
}

String response = chatClient.prompt()
    .user("What's the weather in San Francisco?")
    .functions("currentWeather")
    .call()
    .content();
```

### After (NestJS AI)

```typescript
import { Tool } from '@nestjs-ai/model';

class WeatherTools {
  @Tool({ description: 'Get the weather in a location' })
  currentWeather(location: string): string {
    return JSON.stringify({ location, temperature: 72.0, condition: 'sunny' });
  }
}

const response = await chatClient
  .prompt()
  .user("What's the weather in San Francisco?")
  .tools(new WeatherTools())
  .call()
  .content();
```

---

## 12. Advisor Pattern

### Before (Spring AI)

```java
ChatClient chatClient = ChatClient.builder(chatModel)
    .defaultAdvisors(new MessageChatMemoryAdvisor(chatMemory))
    .build();
```

### After (NestJS AI)

```typescript
import { ChatClient } from '@nestjs-ai/client-chat';
import { MessageChatMemoryAdvisor } from '@nestjs-ai/client-chat';

const chatClient = ChatClient.builder(chatModel)
  .defaultAdvisors(new MessageChatMemoryAdvisor(chatMemory))
  .build();
```

---

## 13. Complete Application Example

### Before (Spring AI)

```java
@SpringBootApplication
public class MyAiApplication {
    public static void main(String[] args) {
        SpringApplication.run(MyAiApplication.class, args);
    }
}

@RestController
class ChatController {
    private final ChatClient chatClient;

    ChatController(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    @GetMapping("/chat")
    String chat(@RequestParam String message) {
        return chatClient.prompt().user(message).call().content();
    }
}
```

### After (NestJS AI)

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { NestAiModule } from '@nestjs-ai/platform';
import { OpenAiChatModelModule } from '@nestjs-ai/model-openai';
import { ChatController } from './chat.controller';

@Module({
  imports: [
    NestAiModule.forRoot(),
    OpenAiChatModelModule.forFeatureAsync({
      useFactory: () => ({
        apiKey: process.env.OPENAI_API_KEY,
      }),
    }),
  ],
  controllers: [ChatController],
})
export class AppModule {}

// chat.controller.ts
import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ChatClient } from '@nestjs-ai/client-chat';
import { CHAT_MODEL_TOKEN } from '@nestjs-ai/commons';
import type { ChatModel } from '@nestjs-ai/model';

@Controller()
export class ChatController {
  private readonly chatClient: ChatClient;

  constructor(@Inject(CHAT_MODEL_TOKEN) chatModel: ChatModel) {
    this.chatClient = ChatClient.create(chatModel);
  }

  @Get('/chat')
  async chat(@Query('message') message: string): Promise<string | null> {
    return this.chatClient.prompt().user(message).call().content();
  }
}

// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
```

---

## General Conversion Notes

1. **All AI calls are async** — always use `await` and mark methods as `async`.
2. **Injection tokens** — NestJS AI uses symbol-based tokens (`CHAT_MODEL_TOKEN`, `EMBEDDING_MODEL_TOKEN`, etc.) instead of type-based injection.
3. **Factory methods** — `ChatClient.create(chatModel)` and `ChatClient.builder(chatModel)` are the primary ways to create a ChatClient, not DI of a builder.
4. **No autoconfiguration** — every module must be explicitly imported in the NestJS module tree.
5. **String quotes** — use single quotes for TypeScript code examples.
6. **Return types** — Spring AI methods that return `String` become `Promise<string | null>` (nullable).
7. **Imports** — always show full import statements in code examples for clarity.
