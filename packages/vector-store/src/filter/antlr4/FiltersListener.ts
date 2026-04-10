
import { ErrorNode, ParseTreeListener, ParserRuleContext, TerminalNode } from "antlr4ng";


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
import { CompoundIdentifierContext } from "./FiltersParser.js";
import { SimpleIdentifierContext } from "./FiltersParser.js";
import { QuotedIdentifierContext } from "./FiltersParser.js";
import { LongConstantContext } from "./FiltersParser.js";
import { IntegerConstantContext } from "./FiltersParser.js";
import { DecimalConstantContext } from "./FiltersParser.js";
import { TextConstantContext } from "./FiltersParser.js";
import { BooleanConstantContext } from "./FiltersParser.js";


/**
 * This interface defines a complete listener for a parse tree produced by
 * `FiltersParser`.
 */
export class FiltersListener implements ParseTreeListener {
    /**
     * Enter a parse tree produced by `FiltersParser.where`.
     * @param ctx the parse tree
     */
    enterWhere?: (ctx: WhereContext) => void;
    /**
     * Exit a parse tree produced by `FiltersParser.where`.
     * @param ctx the parse tree
     */
    exitWhere?: (ctx: WhereContext) => void;
    /**
     * Enter a parse tree produced by the `CompareExpression`
     * labeled alternative in `FiltersParser.booleanExpression`.
     * @param ctx the parse tree
     */
    enterCompareExpression?: (ctx: CompareExpressionContext) => void;
    /**
     * Exit a parse tree produced by the `CompareExpression`
     * labeled alternative in `FiltersParser.booleanExpression`.
     * @param ctx the parse tree
     */
    exitCompareExpression?: (ctx: CompareExpressionContext) => void;
    /**
     * Enter a parse tree produced by the `InExpression`
     * labeled alternative in `FiltersParser.booleanExpression`.
     * @param ctx the parse tree
     */
    enterInExpression?: (ctx: InExpressionContext) => void;
    /**
     * Exit a parse tree produced by the `InExpression`
     * labeled alternative in `FiltersParser.booleanExpression`.
     * @param ctx the parse tree
     */
    exitInExpression?: (ctx: InExpressionContext) => void;
    /**
     * Enter a parse tree produced by the `NinExpression`
     * labeled alternative in `FiltersParser.booleanExpression`.
     * @param ctx the parse tree
     */
    enterNinExpression?: (ctx: NinExpressionContext) => void;
    /**
     * Exit a parse tree produced by the `NinExpression`
     * labeled alternative in `FiltersParser.booleanExpression`.
     * @param ctx the parse tree
     */
    exitNinExpression?: (ctx: NinExpressionContext) => void;
    /**
     * Enter a parse tree produced by the `IsNullExpression`
     * labeled alternative in `FiltersParser.booleanExpression`.
     * @param ctx the parse tree
     */
    enterIsNullExpression?: (ctx: IsNullExpressionContext) => void;
    /**
     * Exit a parse tree produced by the `IsNullExpression`
     * labeled alternative in `FiltersParser.booleanExpression`.
     * @param ctx the parse tree
     */
    exitIsNullExpression?: (ctx: IsNullExpressionContext) => void;
    /**
     * Enter a parse tree produced by the `IsNotNullExpression`
     * labeled alternative in `FiltersParser.booleanExpression`.
     * @param ctx the parse tree
     */
    enterIsNotNullExpression?: (ctx: IsNotNullExpressionContext) => void;
    /**
     * Exit a parse tree produced by the `IsNotNullExpression`
     * labeled alternative in `FiltersParser.booleanExpression`.
     * @param ctx the parse tree
     */
    exitIsNotNullExpression?: (ctx: IsNotNullExpressionContext) => void;
    /**
     * Enter a parse tree produced by the `GroupExpression`
     * labeled alternative in `FiltersParser.booleanExpression`.
     * @param ctx the parse tree
     */
    enterGroupExpression?: (ctx: GroupExpressionContext) => void;
    /**
     * Exit a parse tree produced by the `GroupExpression`
     * labeled alternative in `FiltersParser.booleanExpression`.
     * @param ctx the parse tree
     */
    exitGroupExpression?: (ctx: GroupExpressionContext) => void;
    /**
     * Enter a parse tree produced by the `NotExpression`
     * labeled alternative in `FiltersParser.booleanExpression`.
     * @param ctx the parse tree
     */
    enterNotExpression?: (ctx: NotExpressionContext) => void;
    /**
     * Exit a parse tree produced by the `NotExpression`
     * labeled alternative in `FiltersParser.booleanExpression`.
     * @param ctx the parse tree
     */
    exitNotExpression?: (ctx: NotExpressionContext) => void;
    /**
     * Enter a parse tree produced by the `AndExpression`
     * labeled alternative in `FiltersParser.booleanExpression`.
     * @param ctx the parse tree
     */
    enterAndExpression?: (ctx: AndExpressionContext) => void;
    /**
     * Exit a parse tree produced by the `AndExpression`
     * labeled alternative in `FiltersParser.booleanExpression`.
     * @param ctx the parse tree
     */
    exitAndExpression?: (ctx: AndExpressionContext) => void;
    /**
     * Enter a parse tree produced by the `OrExpression`
     * labeled alternative in `FiltersParser.booleanExpression`.
     * @param ctx the parse tree
     */
    enterOrExpression?: (ctx: OrExpressionContext) => void;
    /**
     * Exit a parse tree produced by the `OrExpression`
     * labeled alternative in `FiltersParser.booleanExpression`.
     * @param ctx the parse tree
     */
    exitOrExpression?: (ctx: OrExpressionContext) => void;
    /**
     * Enter a parse tree produced by `FiltersParser.constantArray`.
     * @param ctx the parse tree
     */
    enterConstantArray?: (ctx: ConstantArrayContext) => void;
    /**
     * Exit a parse tree produced by `FiltersParser.constantArray`.
     * @param ctx the parse tree
     */
    exitConstantArray?: (ctx: ConstantArrayContext) => void;
    /**
     * Enter a parse tree produced by `FiltersParser.compare`.
     * @param ctx the parse tree
     */
    enterCompare?: (ctx: CompareContext) => void;
    /**
     * Exit a parse tree produced by `FiltersParser.compare`.
     * @param ctx the parse tree
     */
    exitCompare?: (ctx: CompareContext) => void;
    /**
     * Enter a parse tree produced by the `CompoundIdentifier`
     * labeled alternative in `FiltersParser.identifier`.
     * @param ctx the parse tree
     */
    enterCompoundIdentifier?: (ctx: CompoundIdentifierContext) => void;
    /**
     * Exit a parse tree produced by the `CompoundIdentifier`
     * labeled alternative in `FiltersParser.identifier`.
     * @param ctx the parse tree
     */
    exitCompoundIdentifier?: (ctx: CompoundIdentifierContext) => void;
    /**
     * Enter a parse tree produced by the `SimpleIdentifier`
     * labeled alternative in `FiltersParser.identifier`.
     * @param ctx the parse tree
     */
    enterSimpleIdentifier?: (ctx: SimpleIdentifierContext) => void;
    /**
     * Exit a parse tree produced by the `SimpleIdentifier`
     * labeled alternative in `FiltersParser.identifier`.
     * @param ctx the parse tree
     */
    exitSimpleIdentifier?: (ctx: SimpleIdentifierContext) => void;
    /**
     * Enter a parse tree produced by the `QuotedIdentifier`
     * labeled alternative in `FiltersParser.identifier`.
     * @param ctx the parse tree
     */
    enterQuotedIdentifier?: (ctx: QuotedIdentifierContext) => void;
    /**
     * Exit a parse tree produced by the `QuotedIdentifier`
     * labeled alternative in `FiltersParser.identifier`.
     * @param ctx the parse tree
     */
    exitQuotedIdentifier?: (ctx: QuotedIdentifierContext) => void;
    /**
     * Enter a parse tree produced by the `LongConstant`
     * labeled alternative in `FiltersParser.constant`.
     * @param ctx the parse tree
     */
    enterLongConstant?: (ctx: LongConstantContext) => void;
    /**
     * Exit a parse tree produced by the `LongConstant`
     * labeled alternative in `FiltersParser.constant`.
     * @param ctx the parse tree
     */
    exitLongConstant?: (ctx: LongConstantContext) => void;
    /**
     * Enter a parse tree produced by the `IntegerConstant`
     * labeled alternative in `FiltersParser.constant`.
     * @param ctx the parse tree
     */
    enterIntegerConstant?: (ctx: IntegerConstantContext) => void;
    /**
     * Exit a parse tree produced by the `IntegerConstant`
     * labeled alternative in `FiltersParser.constant`.
     * @param ctx the parse tree
     */
    exitIntegerConstant?: (ctx: IntegerConstantContext) => void;
    /**
     * Enter a parse tree produced by the `DecimalConstant`
     * labeled alternative in `FiltersParser.constant`.
     * @param ctx the parse tree
     */
    enterDecimalConstant?: (ctx: DecimalConstantContext) => void;
    /**
     * Exit a parse tree produced by the `DecimalConstant`
     * labeled alternative in `FiltersParser.constant`.
     * @param ctx the parse tree
     */
    exitDecimalConstant?: (ctx: DecimalConstantContext) => void;
    /**
     * Enter a parse tree produced by the `TextConstant`
     * labeled alternative in `FiltersParser.constant`.
     * @param ctx the parse tree
     */
    enterTextConstant?: (ctx: TextConstantContext) => void;
    /**
     * Exit a parse tree produced by the `TextConstant`
     * labeled alternative in `FiltersParser.constant`.
     * @param ctx the parse tree
     */
    exitTextConstant?: (ctx: TextConstantContext) => void;
    /**
     * Enter a parse tree produced by the `BooleanConstant`
     * labeled alternative in `FiltersParser.constant`.
     * @param ctx the parse tree
     */
    enterBooleanConstant?: (ctx: BooleanConstantContext) => void;
    /**
     * Exit a parse tree produced by the `BooleanConstant`
     * labeled alternative in `FiltersParser.constant`.
     * @param ctx the parse tree
     */
    exitBooleanConstant?: (ctx: BooleanConstantContext) => void;

    visitTerminal(node: TerminalNode): void {}
    visitErrorNode(node: ErrorNode): void {}
    enterEveryRule(node: ParserRuleContext): void {}
    exitEveryRule(node: ParserRuleContext): void {}
}

