---
name: commit
description: Commit changes following nestjs-ai repository conventions. Use when the user wants to commit changes. Analyzes git diff, generates conventional commit format messages, and executes git commit automatically.
---

# Commit Changes for nestjs-ai

Commit changes following the nestjs-ai repository's conventional commit format. This skill analyzes changes, generates appropriate commit messages, and executes the commit.

## Commit Format

Follow this structure:

```
type(scope): concise description

- Detailed bullet point 1
- Detailed bullet point 2
- Detailed bullet point 3
```

## Commit Types

Use these types based on the change:

- **feat**: New feature or functionality
- **fix**: Bug fix
- **refactor**: Code restructuring without changing behavior
- **test**: Adding or updating tests
- **docs**: Documentation changes
- **chore**: Maintenance tasks, dependencies, tooling

## Scopes

Optional scopes based on affected packages:

- `model`: Changes to `packages/model/`
- `core`: Changes to `packages/core/`
- `commons`: Changes to `packages/commons/`
- `openai`: Changes to `packages/models/openai/`

Use scope when changes are limited to a specific package. Omit scope for cross-package changes.

## Description Guidelines

**Subject line (first line)**:
- Use imperative mood: "add", "fix", "refactor", not "added", "fixed", "refactored"
- Keep under 72 characters
- Be specific but concise
- Mention key functionality or affected component

**Body (bullet points)**:
- Start each bullet with a capital letter
- Use present tense
- Be specific about what changed
- Include context when migrating/porting from Java
- List multiple related changes as separate bullets
- Mention test additions or updates when relevant

## Examples

### Feature Addition

```
feat: add OpenAI model package structure
- Create packages/models/openai workspace package
- Add package.json with @nestjs-ai/model dependency
- Add tsconfig.json configuration
- Update pnpm-workspace.yaml to include models directory
```

### Migration/Porting

```
feat(model): port ChatModel from Java to TypeScript
- Add ChatModel abstract class extending StreamingChatModel
- Implement Model<Prompt, ChatResponse> interface
- Add callString() and callMessages() convenience methods
- Add abstract call() method for prompt-based calls
- Port ChatModelTests from Java with test case names in kebab-case
- Add comprehensive test coverage for various edge cases
```

### Refactoring

```
refactor: simplify ChatResponse and Generation classes
- Remove empty generations validation from ChatResponse constructor
- Remove GenerationBuilder class and related exports
- Update ChatResponseBuilder to use generations() instead of generation()
- Rename chatResponseMetadata() to metadata() in builder
- Update tests to use builder pattern consistently
```

### Bug Fix

```
fix: add null/undefined validation to Prompt constructor and fix lint warnings
- Add null/undefined check for contentOrMessageOrMessages parameter in Prompt constructor
- Fix lint warnings: rename shadowing toString variables to stringValue
- Fix lint warnings: prefix unused variables with underscore
- Apply code formatting fixes
```

### Documentation

```
docs(model): add comprehensive JSDoc comments to core model interfaces and classes
```

### Test Addition

```
test: add chat-model tests matching Java implementation
```

## Commit Workflow

When committing changes, follow these steps:

1. **Check git status**: Run `git status` to see what files are staged or modified
2. **Stage changes if needed**: If user wants to commit unstaged changes, run `git add <files>` or `git add .`
3. **Analyze changes**: Review `git diff --staged` for staged changes or `git diff` for unstaged changes
4. **Determine type**: Classify as feat/fix/refactor/test/docs/chore based on changes
5. **Identify scope**: Check if changes are package-specific (model/core/commons/openai)
6. **Generate commit message**: Create message following the format above
7. **Execute commit**: Run `git commit -m "subject" -m "body"` with the generated message

### Important Notes

- **Always check git status first** before committing
- **Ask for confirmation** if there are unstaged changes - ask if user wants to stage them
- **Use `git commit -m` for subject and `-m` for body** (multiple `-m` flags create multi-line commit)
- **If no changes are staged**, ask user if they want to stage all changes or specific files
- **Never force push** or perform destructive git operations without explicit user request

## Special Cases

- **Java to TypeScript migrations**: Mention "port from Java" or "migrate from Java"
- **Test updates**: Include in body when tests are added/modified
- **Multiple packages**: Omit scope for cross-package changes
- **Linting fixes**: Include in fix commits when fixing lint warnings
- **Co-authors**: Include `Co-authored-by:` line when applicable

## Execution Example

When user asks to commit:

```bash
# 1. Check status
git status

# 2. If needed, stage changes
git add .

# 3. Analyze staged changes
git diff --staged

# 4. Generate commit message based on changes
# Example output:
# feat(model): add new chat options interface
# - Add ChatOptions interface with streaming support
# - Implement default options builder
# - Add comprehensive tests

# 5. Execute commit
git commit -m "feat(model): add new chat options interface" -m "- Add ChatOptions interface with streaming support
- Implement default options builder
- Add comprehensive tests"
```

## Pre-commit Hooks

Note: This repository uses husky with lint-staged. The pre-commit hook will automatically run linting on staged files. If linting fails, the commit will be rejected. Fix linting issues before committing.
