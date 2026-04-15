# Framework Mapping — Spring Boot to NestJS

This file maps Spring Boot / Spring AI concepts to their NestJS / NestJS AI equivalents.
Use this as a reference when converting prose descriptions and architectural explanations in documentation.

## Core Concept Mapping

| Spring Boot / Spring AI | NestJS / NestJS AI | Notes |
|-------------------------|-------------------|-------|
| Auto-configuration | Dynamic Module (`forRoot` / `forFeature`) | Module registration replaces auto-config |
| `@SpringBootApplication` | `NestFactory.create(AppModule)` | Application bootstrap |
| `@Configuration` | `@Module` | Configuration class → NestJS module |
| `@Bean` | `providers` array entry | Bean definition → Provider definition |
| `@Autowired` / constructor injection | `@Inject(TOKEN)` | DI uses symbol-based injection tokens |
| `@Qualifier` | Different injection tokens | Token-based disambiguation |
| `@ConditionalOnProperty` | Module options / conditional providers | Conditional registration |
| `@Value("${...}")` | `process.env.*` or `ConfigService.get()` | Property injection |
| `application.properties` | Module `useFactory` options | Config via factory function |
| `application.yml` | Module `useFactory` options | Config via factory function |
| Spring Boot Starter | `*Module.forFeature()` / `forFeatureAsync()` | Starter → Dynamic module |
| Spring Boot DevTools | NestJS HMR / `--watch` | Hot reload |
| Spring Profiles | `NODE_ENV` / ConfigModule | Environment-based config |

## Web Layer Mapping

| Spring | NestJS | Import from |
|--------|--------|-------------|
| `@RestController` | `@Controller` | `@nestjs/common` |
| `@GetMapping("/path")` | `@Get('/path')` | `@nestjs/common` |
| `@PostMapping("/path")` | `@Post('/path')` | `@nestjs/common` |
| `@PutMapping("/path")` | `@Put('/path')` | `@nestjs/common` |
| `@DeleteMapping("/path")` | `@Delete('/path')` | `@nestjs/common` |
| `@RequestBody` | `@Body()` | `@nestjs/common` |
| `@RequestParam` | `@Query()` | `@nestjs/common` |
| `@PathVariable` | `@Param()` | `@nestjs/common` |
| `@RequestHeader` | `@Headers()` | `@nestjs/common` |
| `ResponseEntity<T>` | Return value + `@HttpCode()` | `@nestjs/common` |

## Reactive / Async Mapping

| Spring / Reactor | NestJS / TypeScript | Notes |
|------------------|---------------------|-------|
| `Flux<T>` | `Observable<T>` | From `rxjs` |
| `Mono<T>` | `Promise<T>` | Native async/await |
| `Flux.just(...)` | `of(...)` | From `rxjs` |
| `Flux.fromIterable(...)` | `from(...)` | From `rxjs` |
| `.map(...)` | `.pipe(map(...))` | RxJS operators |
| `.flatMap(...)` | `.pipe(switchMap(...))` | RxJS operators |
| `.subscribe(...)` | `.subscribe(...)` | Same concept |
| `@Async` | `async` keyword | Native async |
| `CompletableFuture<T>` | `Promise<T>` | Native async |

## Type System Mapping

| Java | TypeScript |
|------|-----------|
| `String` | `string` |
| `int`, `long`, `Integer`, `Long` | `number` |
| `boolean`, `Boolean` | `boolean` |
| `void` | `void` |
| `Object` | `unknown` |
| `@Nullable T` | `T \| null` |
| `List<T>` | `T[]` |
| `Set<T>` | `Set<T>` |
| `Map<K, V>` | `Map<K, V>` or `Record<K, V>` |
| `Map<String, Object>` | `Record<string, unknown>` |
| `Optional<T>` | `T \| null \| undefined` |
| `Class<T>` | Type parameter `<T>` |

## Annotation / Decorator Mapping

| Java Annotation | TypeScript Decorator | Notes |
|----------------|---------------------|-------|
| `@Component` | `@Injectable()` | From `@nestjs/common` |
| `@Service` | `@Injectable()` | Same as Component in NestJS |
| `@Repository` | `@Injectable()` | Same as Component in NestJS |
| `@Scope("prototype")` | `{ scope: Scope.TRANSIENT }` | Provider scope |
| `@Order(n)` | `Ordered` interface | Priority ordering |
| `@Description("...")` | `@Tool({ description: '...' })` | Tool description |

## Build / Package Management Mapping

| Spring / Java | NestJS / TypeScript |
|--------------|---------------------|
| Maven (`pom.xml`) | pnpm (`package.json`) |
| Gradle (`build.gradle`) | pnpm (`package.json`) |
| `<dependency>` / `implementation` | `pnpm add <package>` |
| Maven Central | npm registry |
| Spring BOM | Not needed (pnpm handles versions) |
| `mvn spring-boot:run` | `pnpm start:dev` or `nest start --watch` |
| `mvn test` | `pnpm test` or `vitest` |
| JUnit 5 | Vitest |
| Mockito | vitest mocking (`vi.fn()`, `vi.mock()`) |

## Testing Mapping

| Spring Test | NestJS Test |
|-------------|-------------|
| `@SpringBootTest` | `Test.createTestingModule({...}).compile()` |
| `@MockBean` | `{ provide: TOKEN, useValue: mockObj }` |
| `@TestConfiguration` | Inline test module in `createTestingModule` |
| `TestRestTemplate` | `supertest` with `app.getHttpServer()` |

---

## Module Dependency Chain

When converting documentation, ensure the module dependency chain is clearly explained.
Modules must be imported in an order that satisfies their token dependencies.

```
NestAiModule.forRoot()                           ← MUST be imported first
│                                                   Provides: HTTP_CLIENT_TOKEN
│
├── OpenAiChatModelModule.forFeature()           ← Requires: HTTP_CLIENT_TOKEN
│   │                                               Provides: CHAT_MODEL_TOKEN
│   │
│   ├── ChatClientModule.forFeature()            ← Requires: CHAT_MODEL_TOKEN
│   │                                               Provides: CHAT_CLIENT_BUILDER_TOKEN (transient)
│   │
│   └── (Advisors use ChatClient, no separate module)
│
├── GoogleGenAiChatModelModule.forFeature()      ← Requires: HTTP_CLIENT_TOKEN
│                                                   Provides: CHAT_MODEL_TOKEN
│
├── TransformersEmbeddingModelModule.forFeature()  ← Independent (no HTTP client)
│   │                                                 Provides: EMBEDDING_MODEL_TOKEN
│   │
│   └── RedisVectorStoreModule.forFeature()        ← Requires: EMBEDDING_MODEL_TOKEN
│                                                     Provides: VECTOR_STORE_TOKEN
│
├── ObservationModule.forRoot()                    ← Optional, global
│                                                    Provides: OBSERVATION_REGISTRY_TOKEN
│
├── JsdbcChatMemoryRepositoryModule.forFeature()   ← Requires: JSDBC_TEMPLATE
│                                                     Provides: CHAT_MEMORY_TOKEN
│
└── RedisChatMemoryModule.forFeature()             ← Independent
                                                     Provides: CHAT_MEMORY_TOKEN
```

### Dependency Rules

1. **NestAiModule.forRoot()** must always be the first import — it provides `HTTP_CLIENT_TOKEN` required by all model modules that make API calls.
2. **Chat model modules** (OpenAI, Google GenAI) require `HTTP_CLIENT_TOKEN` from `NestAiModule`.
3. **ChatClientModule** requires `CHAT_MODEL_TOKEN` — a chat model module must be imported first.
4. **Vector store modules** require `EMBEDDING_MODEL_TOKEN` — an embedding model module must be imported first, typically with `global: true`.
5. **Observation module** is optional and global by default — can be imported at any position.
6. **Memory modules** are independent unless they use JSDBC (which requires an ORM module).

---

## Module Method Conventions

| Method | Purpose | Default Scope |
|--------|---------|--------------|
| `forRoot(options?)` | Root singleton configuration | Global (`true`) |
| `forRootAsync(options)` | Root async configuration | Global (`true`) |
| `forFeature(properties, options?)` | Feature-specific configuration | Not global (`false`) |
| `forFeatureAsync(options)` | Feature async configuration | Not global (`false`) |

### Async Options Pattern

All `*Async` methods accept an options object with this shape:

```typescript
{
  imports?: ModuleMetadata['imports'];     // Modules to import for DI
  inject?: InjectionToken[];               // Tokens to inject into factory
  useFactory: (...args) => Properties;     // Factory function
  global?: boolean;                        // Make module global
}
```

---

## Injection Token Reference

| Token | Provided by | Description |
|-------|-------------|-------------|
| `HTTP_CLIENT_TOKEN` | `NestAiModule` | HTTP client for API calls |
| `CHAT_MODEL_TOKEN` | Chat model modules | ChatModel instance |
| `EMBEDDING_MODEL_TOKEN` | Embedding model modules | EmbeddingModel instance |
| `VECTOR_STORE_TOKEN` | Vector store modules | VectorStore instance |
| `CHAT_MEMORY_TOKEN` | Memory modules | ChatMemoryRepository instance |
| `CHAT_CLIENT_BUILDER_TOKEN` | `ChatClientModule` | ChatClient.Builder (transient) |
| `OBSERVATION_REGISTRY_TOKEN` | `ObservationModule` | ObservationRegistry instance |
| `TOOL_CALLING_MANAGER_TOKEN` | `ToolCallingModule` (auto) | ToolCallingManager instance |

All tokens are imported from `@nestjs-ai/commons` except module-specific ones.
