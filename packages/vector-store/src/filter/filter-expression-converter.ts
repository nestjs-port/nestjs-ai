import type { Filter } from "./filter";

export interface FilterExpressionConverter {
  convertExpression(expression: Filter.Expression): string;
}
