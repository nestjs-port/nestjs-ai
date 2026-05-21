import type {
  PgDistanceType,
  PgIdType,
  PgIndexType,
} from "../pg-vector-store.js";

export interface PgVectorStoreProperties {
  initializeSchema?: boolean;
  dimensions?: number;
  indexType?: PgIndexType;
  distanceType?: PgDistanceType;
  removeExistingVectorStoreTable?: boolean;
  tableName?: string;
  schemaName?: string;
  idType?: PgIdType;
  schemaValidation?: boolean;
  maxDocumentBatchSize?: number;
}
