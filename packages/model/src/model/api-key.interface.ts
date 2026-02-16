/**
 * Some model providers API leverage short-lived api keys which must be renewed at regular
 * intervals using another credential. For example, a GCP service account can be exchanged
 * for an api key to call Vertex AI.
 *
 * Model clients use the ApiKey interface to get an api key before they make any request
 * to the model provider. Implementations of this interface can cache the api key and
 * perform a key refresh when it is required.
 */
export interface ApiKey {
  /**
   * Returns an api key to use for a making request. Users of this method should NOT
   * cache the returned api key, instead call this method whenever you need an api key.
   * Implementors of this method MUST ensure that the returned key is not expired.
   * @returns the current value of the api key
   */
  get value(): string;
}
