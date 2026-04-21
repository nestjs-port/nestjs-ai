/*
 * Copyright 2023-present the original author or authors.
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

import assert from "node:assert/strict";
import { type TemplateRenderer, ValidationMode } from "@nestjs-ai/commons";
import { LoggerFactory } from "@nestjs-port/core";
import { Compiler, ST, STGroup, STLexer } from "stringtemplate4ts";
import { Slf4jStErrorListener } from "./slf4j-st-error-listener";

/**
 * Options for creating a StTemplateRenderer instance.
 */
export interface StTemplateRendererProps {
  /**
   * The character used to denote the start of a template variable (e.g., '{').
   * Default is '{'.
   */
  startDelimiterToken?: string;
  /**
   * The character used to denote the end of a template variable (e.g., '}').
   * Default is '}'.
   */
  endDelimiterToken?: string;
  /**
   * The mode to use for template variable validation.
   * Default is ValidationMode.THROW.
   */
  validationMode?: ValidationMode;
  /**
   * Whether to validate StringTemplate functions in the template.
   * When enabled (true), identifiers in the template that match known ST
   * function names (e.g., "first", "rest", "length") will not be treated as
   * required input variables during validation.
   * When disabled (default, false), these identifiers are treated like regular
   * variables and must be provided in the input map if validation is enabled.
   * Default is false.
   */
  validateStFunctions?: boolean;
}

/**
 * Renders a template using the StringTemplate (ST) v4 library.
 *
 * This renderer allows customization of delimiters, validation behavior when template
 * variables are missing, and how StringTemplate's built-in functions are handled during
 * validation.
 *
 * Thread safety: This class is safe for concurrent use. Each call to
 * {@link apply} creates a new StringTemplate instance, and no mutable state
 * is shared between calls.
 */
export class StTemplateRenderer implements TemplateRenderer {
  private static readonly VALIDATION_MESSAGE =
    "Not all variables were replaced in the template. Missing variable names are: %s.";

  private static readonly DEFAULT_START_DELIMITER_TOKEN = "{";

  private static readonly DEFAULT_END_DELIMITER_TOKEN = "}";

  private static readonly DEFAULT_VALIDATION_MODE = ValidationMode.THROW;

  private static readonly DEFAULT_VALIDATE_ST_FUNCTIONS = false;

  private readonly _logger = LoggerFactory.getLogger(StTemplateRenderer.name);

  private readonly _startDelimiterToken: string;

  private readonly _endDelimiterToken: string;

  private readonly _validationMode: ValidationMode;

  private readonly _validateStFunctions: boolean;

  /**
   * Constructs a new {@code StTemplateRenderer} with the specified options.
   * @param options - configuration options for the renderer
   */
  constructor(options: StTemplateRendererProps = {}) {
    const {
      startDelimiterToken,
      endDelimiterToken,
      validationMode,
      validateStFunctions,
    } = options;

    this._startDelimiterToken =
      startDelimiterToken ?? StTemplateRenderer.DEFAULT_START_DELIMITER_TOKEN;
    this._endDelimiterToken =
      endDelimiterToken ?? StTemplateRenderer.DEFAULT_END_DELIMITER_TOKEN;
    this._validationMode =
      validationMode ?? StTemplateRenderer.DEFAULT_VALIDATION_MODE;
    this._validateStFunctions =
      validateStFunctions ?? StTemplateRenderer.DEFAULT_VALIDATE_ST_FUNCTIONS;
    assert(this._validationMode != null, "validationMode cannot be null");
  }

  apply(template: string, variables: Record<string, unknown | null>): string {
    assert(
      template != null && template.length > 0,
      "template cannot be null or empty",
    );
    assert(variables != null, "variables cannot be null");
    const keys = Object.keys(variables);
    for (const key of keys) {
      assert(key != null, "variables keys cannot be null");
    }

    const st = this.createST(template);
    for (const [key, value] of Object.entries(variables)) {
      st.add(key, value);
    }
    if (this._validationMode !== ValidationMode.NONE) {
      this.validate(st, variables);
    }
    return st.render();
  }

  /**
   * Creates a new StringTemplate instance with the configured delimiters.
   */
  private createST(template: string): ST {
    try {
      const group = new STGroup(
        this._startDelimiterToken,
        this._endDelimiterToken,
      );
      group.setListener(new Slf4jStErrorListener(this._logger));
      return new ST(group, template);
    } catch (ex) {
      throw new Error("The template string is not valid.", {
        cause: ex instanceof Error ? ex : undefined,
      });
    }
  }

  /**
   * Validates that all required template variables are provided in the model.
   * Returns the set of missing variables for further handling or logging.
   * @param st - the StringTemplate instance
   * @param templateVariables - the provided variables
   * @returns set of missing variable names, or empty set if none are missing
   */
  private validate(
    st: ST,
    templateVariables: Record<string, unknown | null>,
  ): Set<string> {
    const templateTokens = this.getInputVariables(st);
    const modelKeys = new Set(Object.keys(templateVariables));
    const missingVariables = new Set(templateTokens);
    for (const key of modelKeys) {
      missingVariables.delete(key);
    }

    if (missingVariables.size > 0) {
      const missingList = Array.from(missingVariables).join(", ");
      const message = StTemplateRenderer.VALIDATION_MESSAGE.replace(
        "%s",
        missingList,
      );

      if (this._validationMode === ValidationMode.WARN) {
        this._logger.warn(message);
      } else if (this._validationMode === ValidationMode.THROW) {
        throw new Error(message);
      }
    }
    return missingVariables;
  }

  /**
   * Extracts variable names from the StringTemplate instance.
   */
  private getInputVariables(st: ST): Set<string> {
    const tokens = st.impl?.tokens;
    if (!tokens) {
      return new Set<string>();
    }

    const inputVariables = new Set<string>();
    let isInsideList = false;

    for (let i = 0; i < tokens.size; i++) {
      const token = tokens.get(i);

      // Handle list variables with option (e.g., {items; separator=", "})
      if (
        token.type === STLexer.LDELIM &&
        i + 1 < tokens.size &&
        tokens.get(i + 1).type === STLexer.ID
      ) {
        if (i + 2 < tokens.size && tokens.get(i + 2).type === STLexer.COLON) {
          const text = tokens.get(i + 1).text;
          if (
            text &&
            (!Compiler.funcs.has(text) || this._validateStFunctions)
          ) {
            inputVariables.add(text);
            isInsideList = true;
          }
        }
      } else if (token.type === STLexer.RDELIM) {
        isInsideList = false;
      }
      // Handle regular variables - only add IDs that are at the start of an expression
      else if (!isInsideList && token.type === STLexer.ID) {
        // Check if this ID is a function call
        const isFunctionCall =
          i + 1 < tokens.size && tokens.get(i + 1).type === STLexer.LPAREN;

        // Check if this ID is at the beginning of an expression (not a property access)
        const isAfterDot = i > 0 && tokens.get(i - 1).type === STLexer.DOT;

        // Only add IDs that are:
        // 1. Not function calls
        // 2. Not property values (not preceded by a dot)
        // 3. Either not built-in functions or we're validating functions
        if (!isFunctionCall && !isAfterDot) {
          const varName = token.text;
          if (
            varName &&
            (!Compiler.funcs.has(varName) || this._validateStFunctions)
          ) {
            inputVariables.add(varName);
          }
        }
      }
    }

    return inputVariables;
  }
}
