export interface ProviderInstanceExplorer {
  /**
   * Returns instantiated provider objects currently known by the container.
   */
  getProviderInstances(): object[];
}
