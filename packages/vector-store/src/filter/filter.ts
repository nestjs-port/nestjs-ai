export namespace Filter {
  export enum ExpressionType {
    AND = "AND",
    OR = "OR",
    EQ = "EQ",
    NE = "NE",
    GT = "GT",
    GTE = "GTE",
    LT = "LT",
    LTE = "LTE",
    IN = "IN",
    NIN = "NIN",
    NOT = "NOT",
    ISNULL = "ISNULL",
    ISNOTNULL = "ISNOTNULL",
  }

  export type Operand = {};

  export class Key implements Operand {
    constructor(readonly key: string) {}
  }

  export class Value implements Operand {
    constructor(readonly value: unknown) {}
  }

  export class Expression implements Operand {
    constructor(
      readonly type: ExpressionType,
      readonly left: Operand,
      readonly right: Operand | null = null,
    ) {}
  }

  export class Group implements Operand {
    constructor(readonly content: Expression) {}
  }
}
