import { SCHEMA_FIELD_TYPE } from "@redis/search";

export const RedisMetadataFieldType = SCHEMA_FIELD_TYPE;
export type RedisMetadataFieldType =
  (typeof RedisMetadataFieldType)[keyof typeof RedisMetadataFieldType];

export class RedisMetadataField {
  private constructor(
    public readonly name: string,
    public readonly fieldType: RedisMetadataFieldType,
  ) {}

  static text(name: string): RedisMetadataField {
    return new RedisMetadataField(name, SCHEMA_FIELD_TYPE.TEXT);
  }

  static numeric(name: string): RedisMetadataField {
    return new RedisMetadataField(name, SCHEMA_FIELD_TYPE.NUMERIC);
  }

  static tag(name: string): RedisMetadataField {
    return new RedisMetadataField(name, SCHEMA_FIELD_TYPE.TAG);
  }
}
