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
import { StringUtils } from "@nestjs-port/core";
import {
  type ATNSimulator,
  BailErrorStrategy,
  BaseErrorListener,
  CharStream,
  CommonTokenStream,
  ParseCancellationException,
  type ParserRuleContext,
  type RecognitionException,
  type Recognizer,
  type Token,
} from "antlr4ng";
import {
  type AndExpressionContext,
  type BooleanConstantContext,
  type CompareExpressionContext,
  type CompoundIdentifierContext,
  type ConstantArrayContext,
  type DecimalConstantContext,
  FiltersLexer,
  FiltersParser,
  FiltersVisitor,
  type GroupExpressionContext,
  type InExpressionContext,
  type IntegerConstantContext,
  type IsNotNullExpressionContext,
  type IsNullExpressionContext,
  type LongConstantContext,
  type NinExpressionContext,
  type NotExpressionContext,
  type OrExpressionContext,
  type QuotedIdentifierContext,
  type SimpleIdentifierContext,
  type TextConstantContext,
  type WhereContext,
} from "./antlr4/index.js";
import { Filter } from "./filter.js";

export class FilterExpressionTextParser {
  private static readonly WHERE_PREFIX = "WHERE";

  private readonly _errorListener: DescriptiveErrorListener;
  private readonly _errorHandler: BailErrorStrategy;
  private readonly _cache = new Map<string, Filter.Expression>();

  constructor(errorHandler: BailErrorStrategy = new BailErrorStrategy()) {
    this._errorListener = DescriptiveErrorListener.INSTANCE;
    this._errorHandler = errorHandler;
  }

  parse(textFilterExpression: string): Filter.Expression {
    assert(
      StringUtils.hasText(textFilterExpression),
      "Expression should not be empty!",
    );

    // Prefix the expression with the compulsory WHERE keyword.
    let expressionText = textFilterExpression;
    if (
      !expressionText
        .toUpperCase()
        .startsWith(FilterExpressionTextParser.WHERE_PREFIX)
    ) {
      expressionText = `${FilterExpressionTextParser.WHERE_PREFIX} ${expressionText}`;
    }

    const cached = this._cache.get(expressionText);
    if (cached != null) {
      return cached;
    }

    const lexer = new FiltersLexer(CharStream.fromString(expressionText));
    const tokens = new CommonTokenStream(lexer);
    const parser = new FiltersParser(tokens);

    parser.removeErrorListeners();
    this._errorListener.clear();
    parser.addErrorListener(this._errorListener);
    parser.errorHandler = this._errorHandler;

    const visitor = new FilterExpressionVisitor();
    try {
      const operand = visitor.visit(parser.where()) as Filter.Operand;
      const filterExpression = visitor.castToExpression(operand);
      this._cache.set(expressionText, filterExpression);
      return filterExpression;
    } catch (error) {
      if (error instanceof ParseCancellationException) {
        const message = this._errorListener.errorMessages.join("");
        throw new FilterExpressionParseException(message, getRootCause(error));
      }
      throw error;
    }
  }

  clearCache(): void {
    this._cache.clear();
  }

  get cache(): Map<string, Filter.Expression> {
    return this._cache;
  }
}

export class FilterExpressionParseException extends Error {
  constructor(
    message: string,
    readonly cause: Error | undefined,
  ) {
    super(message);
    this.name = "FilterExpressionParseException";
  }
}

export class FilterExpressionVisitor extends FiltersVisitor<Filter.Operand> {
  private static readonly COMP_EXPRESSION_TYPE_MAP = new Map<
    string,
    Filter.ExpressionType
  >([
    ["==", Filter.ExpressionType.EQ],
    ["!=", Filter.ExpressionType.NE],
    [">", Filter.ExpressionType.GT],
    [">=", Filter.ExpressionType.GTE],
    ["<", Filter.ExpressionType.LT],
    ["<=", Filter.ExpressionType.LTE],
  ]);

  constructor() {
    super();
    this.visitWhere = (ctx: WhereContext): Filter.Operand =>
      this.visit(ctx.booleanExpression()) as Filter.Operand;
    this.visitCompoundIdentifier = (
      ctx: CompoundIdentifierContext,
    ): Filter.Operand =>
      new Filter.Key(this.normalizeIdentifier(ctx.getText()));
    this.visitSimpleIdentifier = (
      ctx: SimpleIdentifierContext,
    ): Filter.Operand =>
      new Filter.Key(this.normalizeIdentifier(ctx.getText()));
    this.visitQuotedIdentifier = (
      ctx: QuotedIdentifierContext,
    ): Filter.Operand =>
      new Filter.Key(this.normalizeIdentifier(ctx.getText()));
    this.visitTextConstant = (ctx: TextConstantContext): Filter.Operand =>
      new Filter.Value(this.unescapeStringValue(ctx.getText()));
    this.visitIntegerConstant = (ctx: IntegerConstantContext): Filter.Operand =>
      new Filter.Value(Number.parseInt(ctx.getText(), 10));
    this.visitDecimalConstant = (ctx: DecimalConstantContext): Filter.Operand =>
      new Filter.Value(Number.parseFloat(ctx.getText()));
    this.visitBooleanConstant = (ctx: BooleanConstantContext): Filter.Operand =>
      new Filter.Value(ctx.getText().toLowerCase() === "true");
    this.visitConstantArray = (ctx: ConstantArrayContext): Filter.Operand => {
      const values = ctx
        .constant()
        .map((constant) => this.visit(constant))
        .map((operand) => (operand as Filter.Value).value);
      return new Filter.Value(values);
    };
    this.visitInExpression = (ctx: InExpressionContext): Filter.Operand =>
      new Filter.Expression(
        Filter.ExpressionType.IN,
        this.visit(ctx.identifier()) as Filter.Operand,
        this.visit(ctx.constantArray()) as Filter.Operand,
      );
    this.visitNinExpression = (ctx: NinExpressionContext): Filter.Operand =>
      new Filter.Expression(
        Filter.ExpressionType.NIN,
        this.visit(ctx.identifier()) as Filter.Operand,
        this.visit(ctx.constantArray()) as Filter.Operand,
      );
    this.visitCompareExpression = (
      ctx: CompareExpressionContext,
    ): Filter.Operand =>
      new Filter.Expression(
        this.convertCompare(ctx.compare().getText()),
        this.visit(ctx.identifier()) as Filter.Operand,
        this.visit(ctx.constant()) as Filter.Operand,
      );
    this.visitIsNullExpression = (
      ctx: IsNullExpressionContext,
    ): Filter.Operand =>
      new Filter.Expression(
        Filter.ExpressionType.ISNULL,
        this.visit(ctx.identifier()) as Filter.Operand,
      );
    this.visitIsNotNullExpression = (
      ctx: IsNotNullExpressionContext,
    ): Filter.Operand =>
      new Filter.Expression(
        Filter.ExpressionType.ISNOTNULL,
        this.visit(ctx.identifier()) as Filter.Operand,
      );
    this.visitAndExpression = (ctx: AndExpressionContext): Filter.Operand =>
      new Filter.Expression(
        Filter.ExpressionType.AND,
        this.visit(ctx._left as ParserRuleContext) as Filter.Operand,
        this.visit(ctx._right as ParserRuleContext) as Filter.Operand,
      );
    this.visitOrExpression = (ctx: OrExpressionContext): Filter.Operand =>
      new Filter.Expression(
        Filter.ExpressionType.OR,
        this.visit(ctx._left as ParserRuleContext) as Filter.Operand,
        this.visit(ctx._right as ParserRuleContext) as Filter.Operand,
      );
    this.visitGroupExpression = (ctx: GroupExpressionContext): Filter.Operand =>
      new Filter.Group(
        this.castToExpression(
          this.visit(ctx.booleanExpression()) as Filter.Operand,
        ),
      );
    this.visitNotExpression = (ctx: NotExpressionContext): Filter.Operand =>
      new Filter.Expression(
        Filter.ExpressionType.NOT,
        this.visit(ctx.booleanExpression()) as Filter.Operand,
        null,
      );
    this.visitLongConstant = (ctx: LongConstantContext): Filter.Operand => {
      const text = ctx.getText();
      return new Filter.Value(Number.parseInt(text.slice(0, -1), 10));
    };
  }

  castToExpression(expression: Filter.Operand): Filter.Expression {
    if (expression instanceof Filter.Group) {
      return expression.content;
    }
    if (expression instanceof Filter.Expression) {
      return expression;
    }
    throw new Error(`Invalid expression: ${String(expression)}`);
  }

  private convertCompare(compare: string): Filter.ExpressionType {
    const expressionType =
      FilterExpressionVisitor.COMP_EXPRESSION_TYPE_MAP.get(compare);
    if (expressionType == null) {
      throw new Error(`Unknown compare operator: ${compare}`);
    }
    return expressionType;
  }

  private unescapeStringValue(input: string): string {
    const quoteStyle = input.at(0);
    const unquoted = input.slice(1, -1);
    switch (quoteStyle) {
      case '"':
        return unquoted.replaceAll('\\"', '"').replaceAll("\\\\", "\\");
      case "'":
        return unquoted.replaceAll("\\'", "'").replaceAll("\\\\", "\\");
      default:
        throw new Error("Unexpected quote style");
    }
  }

  private normalizeIdentifier(input: string): string {
    const quoteStyle = input.at(0);
    if (quoteStyle === '"' || quoteStyle === "'") {
      return this.unescapeStringValue(input);
    }
    return input;
  }
}

export class DescriptiveErrorListener extends BaseErrorListener {
  static readonly INSTANCE = new DescriptiveErrorListener();
  readonly errorMessages: string[] = [];

  syntaxError<S extends Token, T extends ATNSimulator>(
    recognizer: Recognizer<T>,
    _offendingSymbol: S | null,
    line: number,
    charPositionInLine: number,
    msg: string,
    _e: RecognitionException | null,
  ): void {
    const sourceName = recognizer.inputStream?.getSourceName() ?? "<unknown>";
    const errorMessage = `Source: ${sourceName}, Line: ${line}:${charPositionInLine}, Error: ${msg}`;
    this.errorMessages.push(errorMessage);
  }

  clear(): void {
    this.errorMessages.length = 0;
  }
}

function getRootCause(error: unknown): Error | undefined {
  const current = error as { cause?: unknown } | undefined;
  let root = current;
  while (root && root.cause instanceof Error) {
    root = root.cause;
  }
  return root instanceof Error ? root : undefined;
}
