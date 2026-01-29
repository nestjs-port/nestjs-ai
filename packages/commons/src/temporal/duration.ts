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

/**
 * Creates a Milliseconds branded type from a number.
 * @param value - The number of milliseconds
 * @returns The value as a Milliseconds branded type
 */
export function ms(value: number): Milliseconds {
	return value as Milliseconds;
}
