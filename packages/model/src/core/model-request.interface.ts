import type { ModelOptions } from "./model-options.interface";

export interface ModelRequest<T> {
	getInstructions(): T;
	getOptions(): ModelOptions | null;
}
