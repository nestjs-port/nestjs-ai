
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


import { WhereContext } from "./FiltersParser.js";
import { CompareExpressionContext } from "./FiltersParser.js";
import { InExpressionContext } from "./FiltersParser.js";
import { NinExpressionContext } from "./FiltersParser.js";
import { IsNullExpressionContext } from "./FiltersParser.js";
import { IsNotNullExpressionContext } from "./FiltersParser.js";
import { GroupExpressionContext } from "./FiltersParser.js";
import { NotExpressionContext } from "./FiltersParser.js";
import { AndExpressionContext } from "./FiltersParser.js";
import { OrExpressionContext } from "./FiltersParser.js";
import { ConstantArrayContext } from "./FiltersParser.js";
import { CompareContext } from "./FiltersParser.js";
import { IdentifierContext } from "./FiltersParser.js";
import { LongConstantContext } from "./FiltersParser.js";
import { IntegerConstantContext } from "./FiltersParser.js";
import { DecimalConstantContext } from "./FiltersParser.js";
import { TextConstantContext } from "./FiltersParser.js";
import { BooleanConstantContext } from "./FiltersParser.js";


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
     * Visit a parse tree produced by `FiltersParser.identifier`.
     * @param ctx the parse tree
     * @return the visitor result
     */
    visitIdentifier?: (ctx: IdentifierContext) => Result;
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

