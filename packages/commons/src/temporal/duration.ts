/**
 * Brand symbol for Milliseconds type
 */
declare const MillisecondsBrand: unique symbol;

/**
 * Branded type representing a duration in milliseconds.
 * Provides type safety to distinguish milliseconds from plain numbers.
 */
export type Milliseconds = number & {
	readonly [MillisecondsBrand]: typeof MillisecondsBrand;
};
