import type { ModelOptions } from "./model-options.interface";

/**
 * Interface representing a request to an AI model. This interface encapsulates the
 * necessary information required to interact with an AI model, including instructions or
 * inputs (of generic type T) and additional model options. It provides a standardized way
 * to send requests to AI models, ensuring that all necessary details are included and can
 * be easily managed.
 *
 * @typeParam T - the type of instructions or input required by the AI model
 */
export interface ModelRequest<T> {
  /**
   * Retrieves the instructions or input required by the AI model.
   * @returns the instructions or input required by the AI model
   */
  get instructions(): T;

  /**
   * Retrieves the customizable options for AI model interactions.
   * @returns the customizable options for AI model interactions
   */
  get options(): ModelOptions | null;
}
