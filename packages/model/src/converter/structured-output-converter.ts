import type { Converter } from "@nestjs-ai/commons";
import type { FormatProvider } from "./format-provider";

export interface StructuredOutputConverter<T>
	extends Converter<string, T>,
		FormatProvider {}
