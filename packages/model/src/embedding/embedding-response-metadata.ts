import { EmptyUsage, type Usage } from "../chat";
import { AbstractResponseMetadata, type ResponseMetadata } from "../model";

/**
 * Common AI provider metadata returned in an embedding response.
 */
export class EmbeddingResponseMetadata
  extends AbstractResponseMetadata
  implements ResponseMetadata
{
  protected _model: string = "";
  protected _usage: Usage = new EmptyUsage();

  constructor(
    model: string = "",
    usage: Usage = new EmptyUsage(),
    metadata: Record<string, unknown> = {},
  ) {
    super();
    this._model = model;
    this._usage = usage;

    for (const [key, value] of Object.entries(metadata)) {
      this.map.set(key, value);
    }
  }

  /**
   * The model that handled the request.
   */
  get model(): string {
    return this._model;
  }

  set model(model: string) {
    this._model = model;
  }

  /**
   * The AI provider specific metadata on API usage.
   */
  get usage(): Usage {
    return this._usage;
  }

  set usage(usage: Usage) {
    this._usage = usage;
  }
}
