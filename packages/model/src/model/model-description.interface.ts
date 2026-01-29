/**
 * Describes an AI model's basic characteristics. Provides methods to retrieve the model's
 * name, description, and version.
 */
export interface ModelDescription {
	/**
	 * Returns the name of the model.
	 * @returns the name of the model
	 */
	get name(): string;

	/**
	 * Returns the description of the model.
	 * @returns the description of the model
	 */
	get description(): string;

	/**
	 * Returns the version of the model.
	 * @returns the version of the model
	 */
	get version(): string;
}
