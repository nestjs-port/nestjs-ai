export class CommonVectorStoreProperties {
  private _initializeSchema = false;

  get isInitializeSchema(): boolean {
    return this._initializeSchema;
  }

  set initializeSchema(initializeSchema: boolean) {
    this._initializeSchema = initializeSchema;
  }
}
