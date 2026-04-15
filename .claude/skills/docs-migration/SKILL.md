---
name: docs-migration
description: Convert Spring AI AsciiDoc documentation to NestJS AI. Transforms Java code examples to TypeScript, Spring Boot config to NestJS module setup, and Maven/Gradle dependencies to pnpm packages. Analyzes actual NestJS AI source code to generate accurate examples. Use when asked to convert documentation files in `docs/antora/modules/ROOT/pages/`.
---

# Documentation Migration — Spring AI to NestJS AI

Convert AsciiDoc documentation files from Spring AI (Java) to NestJS AI (TypeScript).
Convert only requested files unless explicitly told to perform a batch migration.

## Workflow

1. Confirm migration scope.
Convert only the explicitly requested AsciiDoc file(s).
Target path: `docs/antora/modules/ROOT/pages/`.

2. Analyze the original document.
Read the AsciiDoc file and identify every element that needs conversion:
   - `[source,java]` code blocks
   - Maven/Gradle dependency blocks (often inside `[tabs]` sections)
   - `application.properties` / `application.yml` configuration blocks
   - Spring-specific concept descriptions (auto-configuration, Bean, `@Configuration`, etc.)
   - Framework name references ("Spring AI", "Spring Boot", "Spring Framework")
   - Property tables (prefix `spring.ai.*`)

3. Analyze corresponding NestJS AI source code.
Use `reference/package-mapping.md` to locate the @nestjs-ai package that corresponds to the Spring AI feature described in the document.
   - Read the package's module file (`*Module` class) to get exact `forRoot` / `forFeature` / `forFeatureAsync` signatures.
   - Read the module options interface to get exact property names, types, and defaults.
   - Read relevant source files to verify class names, method signatures, and public API.
   - If the feature is **not yet ported to nestjs-ai**: add a `[NOTE]` admonition stating "This feature is not yet available in NestJS AI." and skip code conversion for that section.

4. Convert document content.
Apply conversion rules from reference files:
   - `reference/code-conversion.md` — Java → TypeScript code example patterns
   - `reference/framework-mapping.md` — Spring → NestJS concept substitutions
   - `reference/package-mapping.md` — dependency declaration conversions
   - Substitute framework names in prose text (see Name Substitution table below)
   - Preserve AsciiDoc structural elements: anchors (`[[...]]`), header hierarchy, `xref:`, tables, images, admonition blocks (`NOTE`, `TIP`, `WARNING`, `IMPORTANT`)

5. Replace "Auto-Configuration" section with "Module Configuration" section.
For every document that has a Spring Boot auto-configuration section, replace it with a NestJS module configuration section that includes **all** of the following:
   - Package installation command with **all required dependencies** (e.g., `pnpm add @nestjs-ai/platform @nestjs-ai/model-openai`)
   - Basic synchronous `forFeature()` setup example
   - Async `forFeatureAsync()` setup example with `useFactory` and `inject`
   - Environment variable usage for API keys (`process.env.*` or `ConfigService`)
   - Module dependency chain explanation (e.g., "`NestAiModule.forRoot()` must be imported before chat model modules")
   - A complete working example showing full `@Module` composition from root to feature
   - Module options table derived from the actual TypeScript interface (property, type, default, description)

6. Handle cross-references (xref).
   - Keep xref links as-is when the target file exists
   - Remove or comment out xrefs pointing to pages that do not exist in the docs directory

7. Verify.
   - Cross-check every converted code example against the actual NestJS AI source code
   - Confirm all import paths, class names, and method signatures are correct
   - Validate AsciiDoc syntax (balanced delimiters, correct block structure)

## Name Substitution Rules

| Original | Replacement |
|----------|-------------|
| Spring AI | NestJS AI |
| Spring Boot | NestJS |
| Spring Framework | NestJS |
| Spring (when referring to the framework) | NestJS |
| Java (when referring to the language) | TypeScript |
| JVM | Node.js |
| Maven Central | npm registry |
| Javadoc | TypeDoc |

Do NOT substitute "Spring" when it appears in proper names (e.g., "Spring Initializr" — remove the entire reference instead).

## Code Block Language Tag Conversion

| Original | Replacement |
|----------|-------------|
| `[source,java]` | `[source,typescript]` |
| `[source,xml]` (Maven POM) | `[source,bash]` (pnpm command) |
| `[source,groovy]` (Gradle) | `[source,bash]` (pnpm command) |
| `[source,properties]` | `[source,typescript]` (module options) |
| `[source,yaml]` (Spring YAML config) | `[source,typescript]` (module options) |
| `[source,kotlin]` | `[source,typescript]` |

## Dependency Declaration Conversion

Replace Maven/Gradle `[tabs]` blocks with a single pnpm command. Always include **all required peer/dependent packages**:

```asciidoc
[source,bash]
----
pnpm add @nestjs-ai/platform @nestjs-ai/model-openai
----
```

Consult `reference/package-mapping.md` for the correct package names and their required dependencies.

## Auto-Configuration → Module Configuration

Replace the entire "Auto-Configuration" section with a "Module Configuration" section.
Follow this template structure:

```asciidoc
== Module Configuration

=== Installation

Install the required packages:

[source,bash]
----
pnpm add @nestjs-ai/platform @nestjs-ai/<feature-package>
----

=== Basic Setup

[source,typescript]
----
import { Module } from '@nestjs/common';
import { NestAiModule } from '@nestjs-ai/platform';
import { <FeatureModule> } from '@nestjs-ai/<feature-package>';

@Module({
  imports: [
    NestAiModule.forRoot(),
    <FeatureModule>.forFeature({
      // options from the actual TypeScript interface
    }),
  ],
})
export class AppModule {}
----

=== Async Configuration

For dynamic configuration (e.g., loading API keys from environment or config service):

[source,typescript]
----
import { Module } from '@nestjs/common';
import { NestAiModule } from '@nestjs-ai/platform';
import { <FeatureModule> } from '@nestjs-ai/<feature-package>';

@Module({
  imports: [
    NestAiModule.forRoot(),
    <FeatureModule>.forFeatureAsync({
      useFactory: () => ({
        apiKey: process.env.<API_KEY_ENV_VAR>,
        // other options
      }),
    }),
  ],
})
export class AppModule {}
----

=== Module Options

[cols="3,2,1,5"]
|====
| Property | Type | Default | Description

| ... | ... | ... | ...
|====
```

## Configuration Property Tables

Replace `application.properties` prefix-based tables with module options tables.
Read the actual TypeScript interface from the package source to generate accurate entries.

Example conversion:

```asciidoc
// BEFORE
| spring.ai.openai.api-key | ... | ...
| spring.ai.openai.chat.options.model | ... | gpt-4o

// AFTER
| apiKey | string | — | The API key for OpenAI authentication
| options.model | string | gpt-4o | The model name to use
```

## Sections to Remove

- Spring Initializr references and links
- Artifact Repositories / BOM setup sections (Maven Central config, Spring Snapshot repos)
- Dependency Management BOM sections
- Spring Boot version requirement notes
- Spring-specific upgrade note links (e.g., `docs.spring.io/spring-ai/reference/upgrade-notes.html`)
- References to `@EnableAutoConfiguration`, `@SpringBootApplication`
- Docker Compose / Testcontainers dev-service references (Spring-specific)

## Sections to Preserve (adapt content)

- AI concept explanations (framework-agnostic content)
- Provider prerequisites (API key setup, account creation — framework-agnostic)
- Table structures (convert content but keep AsciiDoc table format)
- Admonition blocks (NOTE, TIP, WARNING, IMPORTANT, CAUTION)
- Anchors (`[[anchor-name]]`) and header hierarchy
- Images and diagrams
- SQL/shell code blocks that are framework-agnostic

## Reference Files

- `reference/code-conversion.md` — Concrete before/after examples for Java → TypeScript code conversion in documentation context
- `reference/framework-mapping.md` — Spring Boot ↔ NestJS concept mapping and module dependency chain
- `reference/package-mapping.md` — Maven artifact → npm package mapping with required dependencies and module options quick reference

## Checklist

```
Documentation Migration Checklist:
- [ ] Convert only requested file(s)
- [ ] Analyzed corresponding NestJS AI source code for accurate API details
- [ ] Java code examples → TypeScript (verified against actual source)
- [ ] Maven/Gradle dependencies → pnpm with all required dependent packages
- [ ] Spring Boot auto-config section → NestJS module configuration section
- [ ] Module config includes: installation, basic setup, async setup, complete example
- [ ] Module options table generated from actual TypeScript interface
- [ ] Dependency chain documented (which modules depend on which)
- [ ] Framework names substituted in prose text
- [ ] Unported features marked with [NOTE] admonition
- [ ] xref links validated (target files exist)
- [ ] No AsciiDoc syntax errors (balanced delimiters, correct blocks)
- [ ] All import paths, class names, method signatures match actual NestJS AI API
```
