import { SCHEMA_FIELD_TYPE } from "@redis/search";

export type RedisMetadataFieldType =
  (typeof SCHEMA_FIELD_TYPE)[keyof typeof SCHEMA_FIELD_TYPE];

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
