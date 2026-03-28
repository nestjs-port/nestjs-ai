import assert from "node:assert/strict";
import type {
  ClientCapabilities,
  Implementation,
  InitializeResult,
} from "@modelcontextprotocol/sdk/spec.types.js";

export interface McpConnectionInfoProps {
  clientCapabilities: ClientCapabilities;
  clientInfo: Implementation;
  initializeResult?: InitializeResult | null;
}

export class McpConnectionInfo {
  private readonly _clientCapabilities: ClientCapabilities;

  private readonly _clientInfo: Implementation;

  private readonly _initializeResult: InitializeResult | null;

  constructor(props: McpConnectionInfoProps) {
    assert(props != null, "props cannot be null");
    assert(
      props.clientCapabilities != null,
      "clientCapabilities cannot be null",
    );
    assert(props.clientInfo != null, "clientInfo cannot be null");

    this._clientCapabilities = props.clientCapabilities;
    this._clientInfo = props.clientInfo;
    this._initializeResult = props.initializeResult ?? null;
  }

  get clientCapabilities(): ClientCapabilities {
    return this._clientCapabilities;
  }

  get clientInfo(): Implementation {
    return this._clientInfo;
  }

  get initializeResult(): InitializeResult | null {
    return this._initializeResult;
  }
}
