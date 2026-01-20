import type { ModelResult } from "./model-result.interface";
import type { ResponseMetadata } from "./response-metadata.interface";

export interface ModelResponse<T extends ModelResult<unknown>> {
	getResult(): T | null;
	getResults(): T[];
	getMetadata(): ResponseMetadata;
}
