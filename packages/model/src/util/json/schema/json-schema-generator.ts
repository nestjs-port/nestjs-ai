type JsonSchemaNode = Record<string, unknown>;

export enum SchemaOption {
  ALLOW_ADDITIONAL_PROPERTIES_BY_DEFAULT = "ALLOW_ADDITIONAL_PROPERTIES_BY_DEFAULT",
  UPPER_CASE_TYPE_VALUES = "UPPER_CASE_TYPE_VALUES",
}

export class JsonSchemaGenerator {
  private constructor() {
    // Prevent instantiation
  }

  static convertTypeValuesToUpperCase(node: JsonSchemaNode): void {
    if (Array.isArray(node)) {
      for (const element of node) {
        if (element != null && typeof element === "object") {
          JsonSchemaGenerator.convertTypeValuesToUpperCase(
            element as JsonSchemaNode,
          );
        }
      }
    } else if (typeof node === "object" && node != null) {
      for (const [key, value] of Object.entries(node)) {
        if (
          value != null &&
          typeof value === "object" &&
          !Array.isArray(value)
        ) {
          JsonSchemaGenerator.convertTypeValuesToUpperCase(
            value as JsonSchemaNode,
          );
        } else if (Array.isArray(value)) {
          for (const element of value) {
            if (element != null && typeof element === "object") {
              JsonSchemaGenerator.convertTypeValuesToUpperCase(
                element as JsonSchemaNode,
              );
            }
          }
        } else if (typeof value === "string" && key === "type") {
          node[key] = value.toUpperCase();
        }
      }
    }
  }
}
