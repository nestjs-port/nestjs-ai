declare module "spel2js" {
  export const StandardContext: {
    create(authentication: unknown, principal: unknown): unknown;
  };

  export const SpelExpressionEvaluator: {
    eval(expression: string, context: unknown, locals?: unknown): unknown;
    compile(expression: string): {
      eval(context: unknown, locals?: unknown): unknown;
    };
  };
}
