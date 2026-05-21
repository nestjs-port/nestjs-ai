import { AbstractParseTreeVisitor } from "antlr4ng";


/*
 * Copyright 2023-2023 the original author or authors.
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

// ############################################################
// # NOTE: This is ANTLR4 auto-generated code. Do not modify! #
// ############################################################


import type { WhereContext } from "./FiltersParser.js";
import type { CompareExpressionContext } from "./FiltersParser.js";
import type { InExpressionContext } from "./FiltersParser.js";
import type { NinExpressionContext } from "./FiltersParser.js";
import type { IsNullExpressionContext } from "./FiltersParser.js";
import type { IsNotNullExpressionContext } from "./FiltersParser.js";
import type { GroupExpressionContext } from "./FiltersParser.js";
import type { NotExpressionContext } from "./FiltersParser.js";
import type { AndExpressionContext } from "./FiltersParser.js";
import type { OrExpressionContext } from "./FiltersParser.js";
import type { ConstantArrayContext } from "./FiltersParser.js";
import type { CompareContext } from "./FiltersParser.js";
import type { CompoundIdentifierContext } from "./FiltersParser.js";
import type { SimpleIdentifierContext } from "./FiltersParser.js";
import type { QuotedIdentifierContext } from "./FiltersParser.js";
import type { LongConstantContext } from "./FiltersParser.js";
import type { IntegerConstantContext } from "./FiltersParser.js";
import type { DecimalConstantContext } from "./FiltersParser.js";
import type { TextConstantContext } from "./FiltersParser.js";
import type { BooleanConstantContext } from "./FiltersParser.js";


/**
 * This interface defines a complete generic visitor for a parse tree produced
 * by `FiltersParser`.
 *
 * @param <Result> The return type of the visit operation. Use `void` for
 * operations with no return type.
 */
export class FiltersVisitor<Result> extends AbstractParseTreeVisitor<Result> {
    /**
     * Visit a parse tree produced by `FiltersParser.where`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitWhere?: (ctx: WhereContext) => Result;
    /**
     * Visit a parse tree produced by the `CompareExpression`
     * labeled alternative in `FiltersParser.booleanExpression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitCompareExpression?: (ctx: CompareExpressionContext) => Result;
    /**
     * Visit a parse tree produced by the `InExpression`
     * labeled alternative in `FiltersParser.booleanExpression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitInExpression?: (ctx: InExpressionContext) => Result;
    /**
     * Visit a parse tree produced by the `NinExpression`
     * labeled alternative in `FiltersParser.booleanExpression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitNinExpression?: (ctx: NinExpressionContext) => Result;
    /**
     * Visit a parse tree produced by the `IsNullExpression`
     * labeled alternative in `FiltersParser.booleanExpression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitIsNullExpression?: (ctx: IsNullExpressionContext) => Result;
    /**
     * Visit a parse tree produced by the `IsNotNullExpression`
     * labeled alternative in `FiltersParser.booleanExpression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitIsNotNullExpression?: (ctx: IsNotNullExpressionContext) => Result;
    /**
     * Visit a parse tree produced by the `GroupExpression`
     * labeled alternative in `FiltersParser.booleanExpression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitGroupExpression?: (ctx: GroupExpressionContext) => Result;
    /**
     * Visit a parse tree produced by the `NotExpression`
     * labeled alternative in `FiltersParser.booleanExpression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitNotExpression?: (ctx: NotExpressionContext) => Result;
    /**
     * Visit a parse tree produced by the `AndExpression`
     * labeled alternative in `FiltersParser.booleanExpression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitAndExpression?: (ctx: AndExpressionContext) => Result;
    /**
     * Visit a parse tree produced by the `OrExpression`
     * labeled alternative in `FiltersParser.booleanExpression`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitOrExpression?: (ctx: OrExpressionContext) => Result;
    /**
     * Visit a parse tree produced by `FiltersParser.constantArray`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitConstantArray?: (ctx: ConstantArrayContext) => Result;
    /**
     * Visit a parse tree produced by `FiltersParser.compare`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitCompare?: (ctx: CompareContext) => Result;
    /**
     * Visit a parse tree produced by the `CompoundIdentifier`
     * labeled alternative in `FiltersParser.identifier`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitCompoundIdentifier?: (ctx: CompoundIdentifierContext) => Result;
    /**
     * Visit a parse tree produced by the `SimpleIdentifier`
     * labeled alternative in `FiltersParser.identifier`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitSimpleIdentifier?: (ctx: SimpleIdentifierContext) => Result;
    /**
     * Visit a parse tree produced by the `QuotedIdentifier`
     * labeled alternative in `FiltersParser.identifier`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitQuotedIdentifier?: (ctx: QuotedIdentifierContext) => Result;
    /**
     * Visit a parse tree produced by the `LongConstant`
     * labeled alternative in `FiltersParser.constant`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitLongConstant?: (ctx: LongConstantContext) => Result;
    /**
     * Visit a parse tree produced by the `IntegerConstant`
     * labeled alternative in `FiltersParser.constant`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitIntegerConstant?: (ctx: IntegerConstantContext) => Result;
    /**
     * Visit a parse tree produced by the `DecimalConstant`
     * labeled alternative in `FiltersParser.constant`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitDecimalConstant?: (ctx: DecimalConstantContext) => Result;
    /**
     * Visit a parse tree produced by the `TextConstant`
     * labeled alternative in `FiltersParser.constant`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitTextConstant?: (ctx: TextConstantContext) => Result;
    /**
     * Visit a parse tree produced by the `BooleanConstant`
     * labeled alternative in `FiltersParser.constant`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitBooleanConstant?: (ctx: BooleanConstantContext) => Result;
}

