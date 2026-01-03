import type { ResultMetadata } from "./result-metadata.interface";

export interface ModelResult<T> {
	getOutput(): T;
	getMetadata(): ResultMetadata;
}
