import type { ResultSet } from "../api";

export type ResultSetExtractor<T> = (resultSet: ResultSet) => Promise<T>;
