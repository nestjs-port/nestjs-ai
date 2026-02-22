
import * as antlr from "antlr4ng";
import { Token } from "antlr4ng";

import { FiltersListener } from "./FiltersListener.js";
import { FiltersVisitor } from "./FiltersVisitor.js";

// for running tests with parameters, TODO: discuss strategy for typed parameters in CI
// eslint-disable-next-line no-unused-vars
type int = number;


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


export class FiltersParser extends antlr.Parser {
    public static readonly LONG_SUFFIX = 1;
    public static readonly WHERE = 2;
    public static readonly DOT = 3;
    public static readonly COMMA = 4;
    public static readonly LEFT_SQUARE_BRACKETS = 5;
    public static readonly RIGHT_SQUARE_BRACKETS = 6;
    public static readonly LEFT_PARENTHESIS = 7;
    public static readonly RIGHT_PARENTHESIS = 8;
    public static readonly EQUALS = 9;
    public static readonly MINUS = 10;
    public static readonly PLUS = 11;
    public static readonly GT = 12;
    public static readonly GE = 13;
    public static readonly LT = 14;
    public static readonly LE = 15;
    public static readonly NE = 16;
    public static readonly AND = 17;
    public static readonly OR = 18;
    public static readonly IN = 19;
    public static readonly NIN = 20;
    public static readonly NOT = 21;
    public static readonly IS = 22;
    public static readonly NULL = 23;
    public static readonly BOOLEAN_VALUE = 24;
    public static readonly QUOTED_STRING = 25;
    public static readonly INTEGER_VALUE = 26;
    public static readonly DECIMAL_VALUE = 27;
    public static readonly IDENTIFIER = 28;
    public static readonly WS = 29;
    public static readonly RULE_where = 0;
    public static readonly RULE_booleanExpression = 1;
    public static readonly RULE_constantArray = 2;
    public static readonly RULE_compare = 3;
    public static readonly RULE_identifier = 4;
    public static readonly RULE_constant = 5;

    public static readonly literalNames = [
        null, null, null, "'.'", "','", "'['", "']'", "'('", "')'", "'=='", 
        "'-'", "'+'", "'>'", "'>='", "'<'", "'<='", "'!='"
    ];

    public static readonly symbolicNames = [
        null, "LONG_SUFFIX", "WHERE", "DOT", "COMMA", "LEFT_SQUARE_BRACKETS", 
        "RIGHT_SQUARE_BRACKETS", "LEFT_PARENTHESIS", "RIGHT_PARENTHESIS", 
        "EQUALS", "MINUS", "PLUS", "GT", "GE", "LT", "LE", "NE", "AND", 
        "OR", "IN", "NIN", "NOT", "IS", "NULL", "BOOLEAN_VALUE", "QUOTED_STRING", 
        "INTEGER_VALUE", "DECIMAL_VALUE", "IDENTIFIER", "WS"
    ];
    public static readonly ruleNames = [
        "where", "booleanExpression", "constantArray", "compare", "identifier", 
        "constant",
    ];

    public get grammarFileName(): string { return "Filters.g4"; }
    public get literalNames(): (string | null)[] { return FiltersParser.literalNames; }
    public get symbolicNames(): (string | null)[] { return FiltersParser.symbolicNames; }
    public get ruleNames(): string[] { return FiltersParser.ruleNames; }
    public get serializedATN(): number[] { return FiltersParser._serializedATN; }

    protected createFailedPredicateException(predicate?: string, message?: string): antlr.FailedPredicateException {
        return new antlr.FailedPredicateException(this, predicate, message);
    }

    public constructor(input: antlr.TokenStream) {
        super(input);
        this.interpreter = new antlr.ParserATNSimulator(this, FiltersParser._ATN, FiltersParser.decisionsToDFA, new antlr.PredictionContextCache());
    }
    public where(): WhereContext {
        let localContext = new WhereContext(this.context, this.state);
        this.enterRule(localContext, 0, FiltersParser.RULE_where);
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 12;
            this.match(FiltersParser.WHERE);
            this.state = 13;
            this.booleanExpression(0);
            this.state = 14;
            this.match(FiltersParser.EOF);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }

    public booleanExpression(): BooleanExpressionContext;
    public booleanExpression(_p: number): BooleanExpressionContext;
    public booleanExpression(_p?: number): BooleanExpressionContext {
        if (_p === undefined) {
            _p = 0;
        }

        let parentContext = this.context;
        let parentState = this.state;
        let localContext = new BooleanExpressionContext(this.context, parentState);
        let previousContext = localContext;
        let _startState = 2;
        this.enterRecursionRule(localContext, 2, FiltersParser.RULE_booleanExpression, _p);
        try {
            let alternative: number;
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 48;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 1, this.context) ) {
            case 1:
                {
                localContext = new CompareExpressionContext(localContext);
                this.context = localContext;
                previousContext = localContext;

                this.state = 17;
                this.identifier();
                this.state = 18;
                this.compare();
                this.state = 19;
                this.constant();
                }
                break;
            case 2:
                {
                localContext = new InExpressionContext(localContext);
                this.context = localContext;
                previousContext = localContext;
                this.state = 21;
                this.identifier();
                this.state = 22;
                this.match(FiltersParser.IN);
                this.state = 23;
                this.constantArray();
                }
                break;
            case 3:
                {
                localContext = new NinExpressionContext(localContext);
                this.context = localContext;
                previousContext = localContext;
                this.state = 25;
                this.identifier();
                this.state = 29;
                this.errorHandler.sync(this);
                switch (this.tokenStream.LA(1)) {
                case FiltersParser.NOT:
                    {
                    this.state = 26;
                    this.match(FiltersParser.NOT);
                    this.state = 27;
                    this.match(FiltersParser.IN);
                    }
                    break;
                case FiltersParser.NIN:
                    {
                    this.state = 28;
                    this.match(FiltersParser.NIN);
                    }
                    break;
                default:
                    throw new antlr.NoViableAltException(this);
                }
                this.state = 31;
                this.constantArray();
                }
                break;
            case 4:
                {
                localContext = new IsNullExpressionContext(localContext);
                this.context = localContext;
                previousContext = localContext;
                this.state = 33;
                this.identifier();
                this.state = 34;
                this.match(FiltersParser.IS);
                this.state = 35;
                this.match(FiltersParser.NULL);
                }
                break;
            case 5:
                {
                localContext = new IsNotNullExpressionContext(localContext);
                this.context = localContext;
                previousContext = localContext;
                this.state = 37;
                this.identifier();
                this.state = 38;
                this.match(FiltersParser.IS);
                this.state = 39;
                this.match(FiltersParser.NOT);
                this.state = 40;
                this.match(FiltersParser.NULL);
                }
                break;
            case 6:
                {
                localContext = new GroupExpressionContext(localContext);
                this.context = localContext;
                previousContext = localContext;
                this.state = 42;
                this.match(FiltersParser.LEFT_PARENTHESIS);
                this.state = 43;
                this.booleanExpression(0);
                this.state = 44;
                this.match(FiltersParser.RIGHT_PARENTHESIS);
                }
                break;
            case 7:
                {
                localContext = new NotExpressionContext(localContext);
                this.context = localContext;
                previousContext = localContext;
                this.state = 46;
                this.match(FiltersParser.NOT);
                this.state = 47;
                this.booleanExpression(1);
                }
                break;
            }
            this.context!.stop = this.tokenStream.LT(-1);
            this.state = 58;
            this.errorHandler.sync(this);
            alternative = this.interpreter.adaptivePredict(this.tokenStream, 3, this.context);
            while (alternative !== 2 && alternative !== antlr.ATN.INVALID_ALT_NUMBER) {
                if (alternative === 1) {
                    if (this.parseListeners != null) {
                        this.triggerExitRuleEvent();
                    }
                    previousContext = localContext;
                    {
                    this.state = 56;
                    this.errorHandler.sync(this);
                    switch (this.interpreter.adaptivePredict(this.tokenStream, 2, this.context) ) {
                    case 1:
                        {
                        localContext = new AndExpressionContext(new BooleanExpressionContext(parentContext, parentState));
                        (localContext as AndExpressionContext)._left = previousContext;
                        this.pushNewRecursionContext(localContext, _startState, FiltersParser.RULE_booleanExpression);
                        this.state = 50;
                        if (!(this.precpred(this.context, 4))) {
                            throw this.createFailedPredicateException("this.precpred(this.context, 4)");
                        }
                        this.state = 51;
                        (localContext as AndExpressionContext)._operator = this.match(FiltersParser.AND);
                        this.state = 52;
                        (localContext as AndExpressionContext)._right = this.booleanExpression(5);
                        }
                        break;
                    case 2:
                        {
                        localContext = new OrExpressionContext(new BooleanExpressionContext(parentContext, parentState));
                        (localContext as OrExpressionContext)._left = previousContext;
                        this.pushNewRecursionContext(localContext, _startState, FiltersParser.RULE_booleanExpression);
                        this.state = 53;
                        if (!(this.precpred(this.context, 3))) {
                            throw this.createFailedPredicateException("this.precpred(this.context, 3)");
                        }
                        this.state = 54;
                        (localContext as OrExpressionContext)._operator = this.match(FiltersParser.OR);
                        this.state = 55;
                        (localContext as OrExpressionContext)._right = this.booleanExpression(4);
                        }
                        break;
                    }
                    }
                }
                this.state = 60;
                this.errorHandler.sync(this);
                alternative = this.interpreter.adaptivePredict(this.tokenStream, 3, this.context);
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.unrollRecursionContexts(parentContext);
        }
        return localContext;
    }
    public constantArray(): ConstantArrayContext {
        let localContext = new ConstantArrayContext(this.context, this.state);
        this.enterRule(localContext, 4, FiltersParser.RULE_constantArray);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 61;
            this.match(FiltersParser.LEFT_SQUARE_BRACKETS);
            this.state = 62;
            this.constant();
            this.state = 67;
            this.errorHandler.sync(this);
            _la = this.tokenStream.LA(1);
            while (_la === 4) {
                {
                {
                this.state = 63;
                this.match(FiltersParser.COMMA);
                this.state = 64;
                this.constant();
                }
                }
                this.state = 69;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
            }
            this.state = 70;
            this.match(FiltersParser.RIGHT_SQUARE_BRACKETS);
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public compare(): CompareContext {
        let localContext = new CompareContext(this.context, this.state);
        this.enterRule(localContext, 6, FiltersParser.RULE_compare);
        let _la: number;
        try {
            this.enterOuterAlt(localContext, 1);
            {
            this.state = 72;
            _la = this.tokenStream.LA(1);
            if(!((((_la) & ~0x1F) === 0 && ((1 << _la) & 127488) !== 0))) {
            this.errorHandler.recoverInline(this);
            }
            else {
                this.errorHandler.reportMatch(this);
                this.consume();
            }
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public identifier(): IdentifierContext {
        let localContext = new IdentifierContext(this.context, this.state);
        this.enterRule(localContext, 8, FiltersParser.RULE_identifier);
        try {
            this.state = 79;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 5, this.context) ) {
            case 1:
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 74;
                this.match(FiltersParser.IDENTIFIER);
                this.state = 75;
                this.match(FiltersParser.DOT);
                this.state = 76;
                this.match(FiltersParser.IDENTIFIER);
                }
                break;
            case 2:
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 77;
                this.match(FiltersParser.IDENTIFIER);
                }
                break;
            case 3:
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 78;
                this.match(FiltersParser.QUOTED_STRING);
                }
                break;
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }
    public constant(): ConstantContext {
        let localContext = new ConstantContext(this.context, this.state);
        this.enterRule(localContext, 10, FiltersParser.RULE_constant);
        let _la: number;
        try {
            this.state = 96;
            this.errorHandler.sync(this);
            switch (this.interpreter.adaptivePredict(this.tokenStream, 9, this.context) ) {
            case 1:
                localContext = new LongConstantContext(localContext);
                this.enterOuterAlt(localContext, 1);
                {
                this.state = 82;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 10 || _la === 11) {
                    {
                    this.state = 81;
                    _la = this.tokenStream.LA(1);
                    if(!(_la === 10 || _la === 11)) {
                    this.errorHandler.recoverInline(this);
                    }
                    else {
                        this.errorHandler.reportMatch(this);
                        this.consume();
                    }
                    }
                }

                this.state = 84;
                this.match(FiltersParser.INTEGER_VALUE);
                this.state = 85;
                this.match(FiltersParser.LONG_SUFFIX);
                }
                break;
            case 2:
                localContext = new IntegerConstantContext(localContext);
                this.enterOuterAlt(localContext, 2);
                {
                this.state = 87;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 10 || _la === 11) {
                    {
                    this.state = 86;
                    _la = this.tokenStream.LA(1);
                    if(!(_la === 10 || _la === 11)) {
                    this.errorHandler.recoverInline(this);
                    }
                    else {
                        this.errorHandler.reportMatch(this);
                        this.consume();
                    }
                    }
                }

                this.state = 89;
                this.match(FiltersParser.INTEGER_VALUE);
                }
                break;
            case 3:
                localContext = new DecimalConstantContext(localContext);
                this.enterOuterAlt(localContext, 3);
                {
                this.state = 91;
                this.errorHandler.sync(this);
                _la = this.tokenStream.LA(1);
                if (_la === 10 || _la === 11) {
                    {
                    this.state = 90;
                    _la = this.tokenStream.LA(1);
                    if(!(_la === 10 || _la === 11)) {
                    this.errorHandler.recoverInline(this);
                    }
                    else {
                        this.errorHandler.reportMatch(this);
                        this.consume();
                    }
                    }
                }

                this.state = 93;
                this.match(FiltersParser.DECIMAL_VALUE);
                }
                break;
            case 4:
                localContext = new TextConstantContext(localContext);
                this.enterOuterAlt(localContext, 4);
                {
                this.state = 94;
                this.match(FiltersParser.QUOTED_STRING);
                }
                break;
            case 5:
                localContext = new BooleanConstantContext(localContext);
                this.enterOuterAlt(localContext, 5);
                {
                this.state = 95;
                this.match(FiltersParser.BOOLEAN_VALUE);
                }
                break;
            }
        }
        catch (re) {
            if (re instanceof antlr.RecognitionException) {
                this.errorHandler.reportError(this, re);
                this.errorHandler.recover(this, re);
            } else {
                throw re;
            }
        }
        finally {
            this.exitRule();
        }
        return localContext;
    }

    public override sempred(localContext: antlr.ParserRuleContext | null, ruleIndex: number, predIndex: number): boolean {
        switch (ruleIndex) {
        case 1:
            return this.booleanExpression_sempred(localContext as BooleanExpressionContext, predIndex);
        }
        return true;
    }
    private booleanExpression_sempred(localContext: BooleanExpressionContext | null, predIndex: number): boolean {
        switch (predIndex) {
        case 0:
            return this.precpred(this.context, 4);
        case 1:
            return this.precpred(this.context, 3);
        }
        return true;
    }

    public static readonly _serializedATN: number[] = [
        4,1,29,99,2,0,7,0,2,1,7,1,2,2,7,2,2,3,7,3,2,4,7,4,2,5,7,5,1,0,1,
        0,1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,
        1,30,8,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,
        1,1,1,1,1,1,3,1,49,8,1,1,1,1,1,1,1,1,1,1,1,1,1,5,1,57,8,1,10,1,12,
        1,60,9,1,1,2,1,2,1,2,1,2,5,2,66,8,2,10,2,12,2,69,9,2,1,2,1,2,1,3,
        1,3,1,4,1,4,1,4,1,4,1,4,3,4,80,8,4,1,5,3,5,83,8,5,1,5,1,5,1,5,3,
        5,88,8,5,1,5,1,5,3,5,92,8,5,1,5,1,5,1,5,3,5,97,8,5,1,5,0,1,2,6,0,
        2,4,6,8,10,0,2,2,0,9,9,12,16,1,0,10,11,111,0,12,1,0,0,0,2,48,1,0,
        0,0,4,61,1,0,0,0,6,72,1,0,0,0,8,79,1,0,0,0,10,96,1,0,0,0,12,13,5,
        2,0,0,13,14,3,2,1,0,14,15,5,0,0,1,15,1,1,0,0,0,16,17,6,1,-1,0,17,
        18,3,8,4,0,18,19,3,6,3,0,19,20,3,10,5,0,20,49,1,0,0,0,21,22,3,8,
        4,0,22,23,5,19,0,0,23,24,3,4,2,0,24,49,1,0,0,0,25,29,3,8,4,0,26,
        27,5,21,0,0,27,30,5,19,0,0,28,30,5,20,0,0,29,26,1,0,0,0,29,28,1,
        0,0,0,30,31,1,0,0,0,31,32,3,4,2,0,32,49,1,0,0,0,33,34,3,8,4,0,34,
        35,5,22,0,0,35,36,5,23,0,0,36,49,1,0,0,0,37,38,3,8,4,0,38,39,5,22,
        0,0,39,40,5,21,0,0,40,41,5,23,0,0,41,49,1,0,0,0,42,43,5,7,0,0,43,
        44,3,2,1,0,44,45,5,8,0,0,45,49,1,0,0,0,46,47,5,21,0,0,47,49,3,2,
        1,1,48,16,1,0,0,0,48,21,1,0,0,0,48,25,1,0,0,0,48,33,1,0,0,0,48,37,
        1,0,0,0,48,42,1,0,0,0,48,46,1,0,0,0,49,58,1,0,0,0,50,51,10,4,0,0,
        51,52,5,17,0,0,52,57,3,2,1,5,53,54,10,3,0,0,54,55,5,18,0,0,55,57,
        3,2,1,4,56,50,1,0,0,0,56,53,1,0,0,0,57,60,1,0,0,0,58,56,1,0,0,0,
        58,59,1,0,0,0,59,3,1,0,0,0,60,58,1,0,0,0,61,62,5,5,0,0,62,67,3,10,
        5,0,63,64,5,4,0,0,64,66,3,10,5,0,65,63,1,0,0,0,66,69,1,0,0,0,67,
        65,1,0,0,0,67,68,1,0,0,0,68,70,1,0,0,0,69,67,1,0,0,0,70,71,5,6,0,
        0,71,5,1,0,0,0,72,73,7,0,0,0,73,7,1,0,0,0,74,75,5,28,0,0,75,76,5,
        3,0,0,76,80,5,28,0,0,77,80,5,28,0,0,78,80,5,25,0,0,79,74,1,0,0,0,
        79,77,1,0,0,0,79,78,1,0,0,0,80,9,1,0,0,0,81,83,7,1,0,0,82,81,1,0,
        0,0,82,83,1,0,0,0,83,84,1,0,0,0,84,85,5,26,0,0,85,97,5,1,0,0,86,
        88,7,1,0,0,87,86,1,0,0,0,87,88,1,0,0,0,88,89,1,0,0,0,89,97,5,26,
        0,0,90,92,7,1,0,0,91,90,1,0,0,0,91,92,1,0,0,0,92,93,1,0,0,0,93,97,
        5,27,0,0,94,97,5,25,0,0,95,97,5,24,0,0,96,82,1,0,0,0,96,87,1,0,0,
        0,96,91,1,0,0,0,96,94,1,0,0,0,96,95,1,0,0,0,97,11,1,0,0,0,10,29,
        48,56,58,67,79,82,87,91,96
    ];

    private static __ATN: antlr.ATN;
    public static get _ATN(): antlr.ATN {
        if (!FiltersParser.__ATN) {
            FiltersParser.__ATN = new antlr.ATNDeserializer().deserialize(FiltersParser._serializedATN);
        }

        return FiltersParser.__ATN;
    }


    private static readonly vocabulary = new antlr.Vocabulary(FiltersParser.literalNames, FiltersParser.symbolicNames, []);

    public override get vocabulary(): antlr.Vocabulary {
        return FiltersParser.vocabulary;
    }

    private static readonly decisionsToDFA = FiltersParser._ATN.decisionToState.map( (ds: antlr.DecisionState, index: number) => new antlr.DFA(ds, index) );
}

export class WhereContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public WHERE(): antlr.TerminalNode {
        return this.getToken(FiltersParser.WHERE, 0)!;
    }
    public booleanExpression(): BooleanExpressionContext {
        return this.getRuleContext(0, BooleanExpressionContext)!;
    }
    public EOF(): antlr.TerminalNode {
        return this.getToken(FiltersParser.EOF, 0)!;
    }
    public override get ruleIndex(): number {
        return FiltersParser.RULE_where;
    }
    public override enterRule(listener: FiltersListener): void {
        if(listener.enterWhere) {
             listener.enterWhere(this);
        }
    }
    public override exitRule(listener: FiltersListener): void {
        if(listener.exitWhere) {
             listener.exitWhere(this);
        }
    }
    public override accept<Result>(visitor: FiltersVisitor<Result>): Result | null {
        if (visitor.visitWhere) {
            return visitor.visitWhere(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class BooleanExpressionContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public override get ruleIndex(): number {
        return FiltersParser.RULE_booleanExpression;
    }
    public override copyFrom(ctx: BooleanExpressionContext): void {
        super.copyFrom(ctx);
    }
}
export class CompareExpressionContext extends BooleanExpressionContext {
    public constructor(ctx: BooleanExpressionContext) {
        super(ctx.parent, ctx.invokingState);
        super.copyFrom(ctx);
    }
    public identifier(): IdentifierContext {
        return this.getRuleContext(0, IdentifierContext)!;
    }
    public compare(): CompareContext {
        return this.getRuleContext(0, CompareContext)!;
    }
    public constant(): ConstantContext {
        return this.getRuleContext(0, ConstantContext)!;
    }
    public override enterRule(listener: FiltersListener): void {
        if(listener.enterCompareExpression) {
             listener.enterCompareExpression(this);
        }
    }
    public override exitRule(listener: FiltersListener): void {
        if(listener.exitCompareExpression) {
             listener.exitCompareExpression(this);
        }
    }
    public override accept<Result>(visitor: FiltersVisitor<Result>): Result | null {
        if (visitor.visitCompareExpression) {
            return visitor.visitCompareExpression(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}
export class InExpressionContext extends BooleanExpressionContext {
    public constructor(ctx: BooleanExpressionContext) {
        super(ctx.parent, ctx.invokingState);
        super.copyFrom(ctx);
    }
    public identifier(): IdentifierContext {
        return this.getRuleContext(0, IdentifierContext)!;
    }
    public IN(): antlr.TerminalNode {
        return this.getToken(FiltersParser.IN, 0)!;
    }
    public constantArray(): ConstantArrayContext {
        return this.getRuleContext(0, ConstantArrayContext)!;
    }
    public override enterRule(listener: FiltersListener): void {
        if(listener.enterInExpression) {
             listener.enterInExpression(this);
        }
    }
    public override exitRule(listener: FiltersListener): void {
        if(listener.exitInExpression) {
             listener.exitInExpression(this);
        }
    }
    public override accept<Result>(visitor: FiltersVisitor<Result>): Result | null {
        if (visitor.visitInExpression) {
            return visitor.visitInExpression(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}
export class NinExpressionContext extends BooleanExpressionContext {
    public constructor(ctx: BooleanExpressionContext) {
        super(ctx.parent, ctx.invokingState);
        super.copyFrom(ctx);
    }
    public identifier(): IdentifierContext {
        return this.getRuleContext(0, IdentifierContext)!;
    }
    public constantArray(): ConstantArrayContext {
        return this.getRuleContext(0, ConstantArrayContext)!;
    }
    public NOT(): antlr.TerminalNode | null {
        return this.getToken(FiltersParser.NOT, 0);
    }
    public IN(): antlr.TerminalNode | null {
        return this.getToken(FiltersParser.IN, 0);
    }
    public NIN(): antlr.TerminalNode | null {
        return this.getToken(FiltersParser.NIN, 0);
    }
    public override enterRule(listener: FiltersListener): void {
        if(listener.enterNinExpression) {
             listener.enterNinExpression(this);
        }
    }
    public override exitRule(listener: FiltersListener): void {
        if(listener.exitNinExpression) {
             listener.exitNinExpression(this);
        }
    }
    public override accept<Result>(visitor: FiltersVisitor<Result>): Result | null {
        if (visitor.visitNinExpression) {
            return visitor.visitNinExpression(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}
export class IsNullExpressionContext extends BooleanExpressionContext {
    public constructor(ctx: BooleanExpressionContext) {
        super(ctx.parent, ctx.invokingState);
        super.copyFrom(ctx);
    }
    public identifier(): IdentifierContext {
        return this.getRuleContext(0, IdentifierContext)!;
    }
    public IS(): antlr.TerminalNode {
        return this.getToken(FiltersParser.IS, 0)!;
    }
    public NULL(): antlr.TerminalNode {
        return this.getToken(FiltersParser.NULL, 0)!;
    }
    public override enterRule(listener: FiltersListener): void {
        if(listener.enterIsNullExpression) {
             listener.enterIsNullExpression(this);
        }
    }
    public override exitRule(listener: FiltersListener): void {
        if(listener.exitIsNullExpression) {
             listener.exitIsNullExpression(this);
        }
    }
    public override accept<Result>(visitor: FiltersVisitor<Result>): Result | null {
        if (visitor.visitIsNullExpression) {
            return visitor.visitIsNullExpression(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}
export class IsNotNullExpressionContext extends BooleanExpressionContext {
    public constructor(ctx: BooleanExpressionContext) {
        super(ctx.parent, ctx.invokingState);
        super.copyFrom(ctx);
    }
    public identifier(): IdentifierContext {
        return this.getRuleContext(0, IdentifierContext)!;
    }
    public IS(): antlr.TerminalNode {
        return this.getToken(FiltersParser.IS, 0)!;
    }
    public NOT(): antlr.TerminalNode {
        return this.getToken(FiltersParser.NOT, 0)!;
    }
    public NULL(): antlr.TerminalNode {
        return this.getToken(FiltersParser.NULL, 0)!;
    }
    public override enterRule(listener: FiltersListener): void {
        if(listener.enterIsNotNullExpression) {
             listener.enterIsNotNullExpression(this);
        }
    }
    public override exitRule(listener: FiltersListener): void {
        if(listener.exitIsNotNullExpression) {
             listener.exitIsNotNullExpression(this);
        }
    }
    public override accept<Result>(visitor: FiltersVisitor<Result>): Result | null {
        if (visitor.visitIsNotNullExpression) {
            return visitor.visitIsNotNullExpression(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}
export class GroupExpressionContext extends BooleanExpressionContext {
    public constructor(ctx: BooleanExpressionContext) {
        super(ctx.parent, ctx.invokingState);
        super.copyFrom(ctx);
    }
    public LEFT_PARENTHESIS(): antlr.TerminalNode {
        return this.getToken(FiltersParser.LEFT_PARENTHESIS, 0)!;
    }
    public booleanExpression(): BooleanExpressionContext {
        return this.getRuleContext(0, BooleanExpressionContext)!;
    }
    public RIGHT_PARENTHESIS(): antlr.TerminalNode {
        return this.getToken(FiltersParser.RIGHT_PARENTHESIS, 0)!;
    }
    public override enterRule(listener: FiltersListener): void {
        if(listener.enterGroupExpression) {
             listener.enterGroupExpression(this);
        }
    }
    public override exitRule(listener: FiltersListener): void {
        if(listener.exitGroupExpression) {
             listener.exitGroupExpression(this);
        }
    }
    public override accept<Result>(visitor: FiltersVisitor<Result>): Result | null {
        if (visitor.visitGroupExpression) {
            return visitor.visitGroupExpression(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}
export class NotExpressionContext extends BooleanExpressionContext {
    public constructor(ctx: BooleanExpressionContext) {
        super(ctx.parent, ctx.invokingState);
        super.copyFrom(ctx);
    }
    public NOT(): antlr.TerminalNode {
        return this.getToken(FiltersParser.NOT, 0)!;
    }
    public booleanExpression(): BooleanExpressionContext {
        return this.getRuleContext(0, BooleanExpressionContext)!;
    }
    public override enterRule(listener: FiltersListener): void {
        if(listener.enterNotExpression) {
             listener.enterNotExpression(this);
        }
    }
    public override exitRule(listener: FiltersListener): void {
        if(listener.exitNotExpression) {
             listener.exitNotExpression(this);
        }
    }
    public override accept<Result>(visitor: FiltersVisitor<Result>): Result | null {
        if (visitor.visitNotExpression) {
            return visitor.visitNotExpression(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}
export class AndExpressionContext extends BooleanExpressionContext {
    public _left?: BooleanExpressionContext;
    public _operator?: Token | null;
    public _right?: BooleanExpressionContext;
    public constructor(ctx: BooleanExpressionContext) {
        super(ctx.parent, ctx.invokingState);
        super.copyFrom(ctx);
    }
    public booleanExpression(): BooleanExpressionContext[];
    public booleanExpression(i: number): BooleanExpressionContext | null;
    public booleanExpression(i?: number): BooleanExpressionContext[] | BooleanExpressionContext | null {
        if (i === undefined) {
            return this.getRuleContexts(BooleanExpressionContext);
        }

        return this.getRuleContext(i, BooleanExpressionContext);
    }
    public AND(): antlr.TerminalNode {
        return this.getToken(FiltersParser.AND, 0)!;
    }
    public override enterRule(listener: FiltersListener): void {
        if(listener.enterAndExpression) {
             listener.enterAndExpression(this);
        }
    }
    public override exitRule(listener: FiltersListener): void {
        if(listener.exitAndExpression) {
             listener.exitAndExpression(this);
        }
    }
    public override accept<Result>(visitor: FiltersVisitor<Result>): Result | null {
        if (visitor.visitAndExpression) {
            return visitor.visitAndExpression(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}
export class OrExpressionContext extends BooleanExpressionContext {
    public _left?: BooleanExpressionContext;
    public _operator?: Token | null;
    public _right?: BooleanExpressionContext;
    public constructor(ctx: BooleanExpressionContext) {
        super(ctx.parent, ctx.invokingState);
        super.copyFrom(ctx);
    }
    public booleanExpression(): BooleanExpressionContext[];
    public booleanExpression(i: number): BooleanExpressionContext | null;
    public booleanExpression(i?: number): BooleanExpressionContext[] | BooleanExpressionContext | null {
        if (i === undefined) {
            return this.getRuleContexts(BooleanExpressionContext);
        }

        return this.getRuleContext(i, BooleanExpressionContext);
    }
    public OR(): antlr.TerminalNode {
        return this.getToken(FiltersParser.OR, 0)!;
    }
    public override enterRule(listener: FiltersListener): void {
        if(listener.enterOrExpression) {
             listener.enterOrExpression(this);
        }
    }
    public override exitRule(listener: FiltersListener): void {
        if(listener.exitOrExpression) {
             listener.exitOrExpression(this);
        }
    }
    public override accept<Result>(visitor: FiltersVisitor<Result>): Result | null {
        if (visitor.visitOrExpression) {
            return visitor.visitOrExpression(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class ConstantArrayContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public LEFT_SQUARE_BRACKETS(): antlr.TerminalNode {
        return this.getToken(FiltersParser.LEFT_SQUARE_BRACKETS, 0)!;
    }
    public constant(): ConstantContext[];
    public constant(i: number): ConstantContext | null;
    public constant(i?: number): ConstantContext[] | ConstantContext | null {
        if (i === undefined) {
            return this.getRuleContexts(ConstantContext);
        }

        return this.getRuleContext(i, ConstantContext);
    }
    public RIGHT_SQUARE_BRACKETS(): antlr.TerminalNode {
        return this.getToken(FiltersParser.RIGHT_SQUARE_BRACKETS, 0)!;
    }
    public COMMA(): antlr.TerminalNode[];
    public COMMA(i: number): antlr.TerminalNode | null;
    public COMMA(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(FiltersParser.COMMA);
    	} else {
    		return this.getToken(FiltersParser.COMMA, i);
    	}
    }
    public override get ruleIndex(): number {
        return FiltersParser.RULE_constantArray;
    }
    public override enterRule(listener: FiltersListener): void {
        if(listener.enterConstantArray) {
             listener.enterConstantArray(this);
        }
    }
    public override exitRule(listener: FiltersListener): void {
        if(listener.exitConstantArray) {
             listener.exitConstantArray(this);
        }
    }
    public override accept<Result>(visitor: FiltersVisitor<Result>): Result | null {
        if (visitor.visitConstantArray) {
            return visitor.visitConstantArray(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class CompareContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public EQUALS(): antlr.TerminalNode | null {
        return this.getToken(FiltersParser.EQUALS, 0);
    }
    public GT(): antlr.TerminalNode | null {
        return this.getToken(FiltersParser.GT, 0);
    }
    public GE(): antlr.TerminalNode | null {
        return this.getToken(FiltersParser.GE, 0);
    }
    public LT(): antlr.TerminalNode | null {
        return this.getToken(FiltersParser.LT, 0);
    }
    public LE(): antlr.TerminalNode | null {
        return this.getToken(FiltersParser.LE, 0);
    }
    public NE(): antlr.TerminalNode | null {
        return this.getToken(FiltersParser.NE, 0);
    }
    public override get ruleIndex(): number {
        return FiltersParser.RULE_compare;
    }
    public override enterRule(listener: FiltersListener): void {
        if(listener.enterCompare) {
             listener.enterCompare(this);
        }
    }
    public override exitRule(listener: FiltersListener): void {
        if(listener.exitCompare) {
             listener.exitCompare(this);
        }
    }
    public override accept<Result>(visitor: FiltersVisitor<Result>): Result | null {
        if (visitor.visitCompare) {
            return visitor.visitCompare(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class IdentifierContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public IDENTIFIER(): antlr.TerminalNode[];
    public IDENTIFIER(i: number): antlr.TerminalNode | null;
    public IDENTIFIER(i?: number): antlr.TerminalNode | null | antlr.TerminalNode[] {
    	if (i === undefined) {
    		return this.getTokens(FiltersParser.IDENTIFIER);
    	} else {
    		return this.getToken(FiltersParser.IDENTIFIER, i);
    	}
    }
    public DOT(): antlr.TerminalNode | null {
        return this.getToken(FiltersParser.DOT, 0);
    }
    public QUOTED_STRING(): antlr.TerminalNode | null {
        return this.getToken(FiltersParser.QUOTED_STRING, 0);
    }
    public override get ruleIndex(): number {
        return FiltersParser.RULE_identifier;
    }
    public override enterRule(listener: FiltersListener): void {
        if(listener.enterIdentifier) {
             listener.enterIdentifier(this);
        }
    }
    public override exitRule(listener: FiltersListener): void {
        if(listener.exitIdentifier) {
             listener.exitIdentifier(this);
        }
    }
    public override accept<Result>(visitor: FiltersVisitor<Result>): Result | null {
        if (visitor.visitIdentifier) {
            return visitor.visitIdentifier(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}


export class ConstantContext extends antlr.ParserRuleContext {
    public constructor(parent: antlr.ParserRuleContext | null, invokingState: number) {
        super(parent, invokingState);
    }
    public override get ruleIndex(): number {
        return FiltersParser.RULE_constant;
    }
    public override copyFrom(ctx: ConstantContext): void {
        super.copyFrom(ctx);
    }
}
export class LongConstantContext extends ConstantContext {
    public constructor(ctx: ConstantContext) {
        super(ctx.parent, ctx.invokingState);
        super.copyFrom(ctx);
    }
    public INTEGER_VALUE(): antlr.TerminalNode {
        return this.getToken(FiltersParser.INTEGER_VALUE, 0)!;
    }
    public LONG_SUFFIX(): antlr.TerminalNode {
        return this.getToken(FiltersParser.LONG_SUFFIX, 0)!;
    }
    public MINUS(): antlr.TerminalNode | null {
        return this.getToken(FiltersParser.MINUS, 0);
    }
    public PLUS(): antlr.TerminalNode | null {
        return this.getToken(FiltersParser.PLUS, 0);
    }
    public override enterRule(listener: FiltersListener): void {
        if(listener.enterLongConstant) {
             listener.enterLongConstant(this);
        }
    }
    public override exitRule(listener: FiltersListener): void {
        if(listener.exitLongConstant) {
             listener.exitLongConstant(this);
        }
    }
    public override accept<Result>(visitor: FiltersVisitor<Result>): Result | null {
        if (visitor.visitLongConstant) {
            return visitor.visitLongConstant(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}
export class IntegerConstantContext extends ConstantContext {
    public constructor(ctx: ConstantContext) {
        super(ctx.parent, ctx.invokingState);
        super.copyFrom(ctx);
    }
    public INTEGER_VALUE(): antlr.TerminalNode {
        return this.getToken(FiltersParser.INTEGER_VALUE, 0)!;
    }
    public MINUS(): antlr.TerminalNode | null {
        return this.getToken(FiltersParser.MINUS, 0);
    }
    public PLUS(): antlr.TerminalNode | null {
        return this.getToken(FiltersParser.PLUS, 0);
    }
    public override enterRule(listener: FiltersListener): void {
        if(listener.enterIntegerConstant) {
             listener.enterIntegerConstant(this);
        }
    }
    public override exitRule(listener: FiltersListener): void {
        if(listener.exitIntegerConstant) {
             listener.exitIntegerConstant(this);
        }
    }
    public override accept<Result>(visitor: FiltersVisitor<Result>): Result | null {
        if (visitor.visitIntegerConstant) {
            return visitor.visitIntegerConstant(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}
export class DecimalConstantContext extends ConstantContext {
    public constructor(ctx: ConstantContext) {
        super(ctx.parent, ctx.invokingState);
        super.copyFrom(ctx);
    }
    public DECIMAL_VALUE(): antlr.TerminalNode {
        return this.getToken(FiltersParser.DECIMAL_VALUE, 0)!;
    }
    public MINUS(): antlr.TerminalNode | null {
        return this.getToken(FiltersParser.MINUS, 0);
    }
    public PLUS(): antlr.TerminalNode | null {
        return this.getToken(FiltersParser.PLUS, 0);
    }
    public override enterRule(listener: FiltersListener): void {
        if(listener.enterDecimalConstant) {
             listener.enterDecimalConstant(this);
        }
    }
    public override exitRule(listener: FiltersListener): void {
        if(listener.exitDecimalConstant) {
             listener.exitDecimalConstant(this);
        }
    }
    public override accept<Result>(visitor: FiltersVisitor<Result>): Result | null {
        if (visitor.visitDecimalConstant) {
            return visitor.visitDecimalConstant(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}
export class TextConstantContext extends ConstantContext {
    public constructor(ctx: ConstantContext) {
        super(ctx.parent, ctx.invokingState);
        super.copyFrom(ctx);
    }
    public QUOTED_STRING(): antlr.TerminalNode {
        return this.getToken(FiltersParser.QUOTED_STRING, 0)!;
    }
    public override enterRule(listener: FiltersListener): void {
        if(listener.enterTextConstant) {
             listener.enterTextConstant(this);
        }
    }
    public override exitRule(listener: FiltersListener): void {
        if(listener.exitTextConstant) {
             listener.exitTextConstant(this);
        }
    }
    public override accept<Result>(visitor: FiltersVisitor<Result>): Result | null {
        if (visitor.visitTextConstant) {
            return visitor.visitTextConstant(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}
export class BooleanConstantContext extends ConstantContext {
    public constructor(ctx: ConstantContext) {
        super(ctx.parent, ctx.invokingState);
        super.copyFrom(ctx);
    }
    public BOOLEAN_VALUE(): antlr.TerminalNode {
        return this.getToken(FiltersParser.BOOLEAN_VALUE, 0)!;
    }
    public override enterRule(listener: FiltersListener): void {
        if(listener.enterBooleanConstant) {
             listener.enterBooleanConstant(this);
        }
    }
    public override exitRule(listener: FiltersListener): void {
        if(listener.exitBooleanConstant) {
             listener.exitBooleanConstant(this);
        }
    }
    public override accept<Result>(visitor: FiltersVisitor<Result>): Result | null {
        if (visitor.visitBooleanConstant) {
            return visitor.visitBooleanConstant(this);
        } else {
            return visitor.visitChildren(this);
        }
    }
}
