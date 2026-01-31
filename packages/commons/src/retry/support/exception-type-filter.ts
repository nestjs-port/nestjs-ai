/**
 * Type alias for error constructor types.
 */
type ErrorType = new (...args: never[]) => Error;

/**
 * A filter that handles exception types with include/exclude collections.
 *
 * An exception type will match against a given candidate if it is assignable
 * to that candidate (i.e., the error is an instance of the candidate type).
 */
export class ExceptionTypeFilter {
	private readonly includes: ErrorType[];
	private readonly excludes: ErrorType[];
	private readonly matchIfEmpty: boolean;

	/**
	 * Create a new ExceptionTypeFilter based on include and exclude collections.
	 *
	 * @param includes - The collection of error types to include
	 * @param excludes - The collection of error types to exclude
	 * @param matchIfEmpty - The matching result if the includes and the excludes
	 * collections are both empty (defaults to true)
	 */
	constructor(
		includes: ErrorType[] = [],
		excludes: ErrorType[] = [],
		matchIfEmpty = true,
	) {
		this.includes = [...includes];
		this.excludes = [...excludes];
		this.matchIfEmpty = matchIfEmpty;
	}

	/**
	 * Determine if the type of the supplied error matches this filter.
	 *
	 * @param error - The error to match against
	 * @param traverseCauses - Whether the matching algorithm should recursively
	 * match against nested causes of the error (defaults to false)
	 * @returns true if this filter matches the supplied error or one of its nested causes
	 */
	match(error: Error, traverseCauses = false): boolean {
		return traverseCauses
			? this.matchTraversingCauses(error)
			: this.matchType(error.constructor as ErrorType);
	}

	/**
	 * Determine if the specified instance type matches the specified candidate type.
	 *
	 * By default, the two types match if the error is an instance of the candidate type.
	 * Can be overridden by subclasses.
	 *
	 * @param instance - The instance type to check
	 * @param candidate - A candidate type defined by this filter
	 * @returns true if the instance matches the candidate
	 */
	protected matchInstance(instance: ErrorType, candidate: ErrorType): boolean {
		// In TypeScript, we check if the instance's prototype chain includes the candidate
		// This is equivalent to Java's candidate.isAssignableFrom(instance)
		return (
			instance === candidate ||
			instance.prototype instanceof candidate ||
			Object.prototype.isPrototypeOf.call(
				candidate.prototype,
				instance.prototype,
			)
		);
	}

	private matchTraversingCauses(error: Error): boolean {
		const emptyIncludes = this.includes.length === 0;
		const emptyExcludes = this.excludes.length === 0;

		if (emptyIncludes && emptyExcludes) {
			return this.matchIfEmpty;
		}

		if (
			!emptyExcludes &&
			this.matchTraversingCausesAgainst(error, this.excludes)
		) {
			return false;
		}

		return (
			emptyIncludes || this.matchTraversingCausesAgainst(error, this.includes)
		);
	}

	private matchTraversingCausesAgainst(
		error: Error,
		candidateTypes: ErrorType[],
	): boolean {
		for (const candidateType of candidateTypes) {
			let current: Error | undefined = error;
			while (current != null) {
				if (
					this.matchInstance(current.constructor as ErrorType, candidateType)
				) {
					return true;
				}
				current = current.cause instanceof Error ? current.cause : undefined;
			}
		}
		return false;
	}

	private matchType(instanceType: ErrorType): boolean {
		const emptyIncludes = this.includes.length === 0;
		const emptyExcludes = this.excludes.length === 0;

		if (emptyIncludes && emptyExcludes) {
			return this.matchIfEmpty;
		}

		if (
			!emptyExcludes &&
			this.excludes.some((type) => this.matchInstance(instanceType, type))
		) {
			return false;
		}

		return (
			emptyIncludes ||
			this.includes.some((type) => this.matchInstance(instanceType, type))
		);
	}
}
