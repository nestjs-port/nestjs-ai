import type { Document } from "../document";

export class EvaluationRequest {
  private readonly _userText: string;
  private readonly _dataList: Document[];
  private readonly _responseContent: string;

  constructor(userText: string, responseContent: string);
  constructor(dataList: Document[], responseContent: string);
  constructor(userText: string, dataList: Document[], responseContent: string);
  constructor(
    userTextOrDataList: string | Document[],
    dataListOrResponseContent: Document[] | string,
    responseContent?: string,
  ) {
    if (typeof userTextOrDataList === "string") {
      this._userText = userTextOrDataList;
      if (Array.isArray(dataListOrResponseContent)) {
        this._dataList = [...dataListOrResponseContent];
        this._responseContent = responseContent ?? "";
      } else {
        this._dataList = [];
        this._responseContent = dataListOrResponseContent;
      }
      return;
    }

    this._userText = "";
    this._dataList = [...userTextOrDataList];
    this._responseContent =
      typeof dataListOrResponseContent === "string"
        ? dataListOrResponseContent
        : (responseContent ?? "");
  }

  get userText(): string {
    return this._userText;
  }

  get dataList(): Document[] {
    return [...this._dataList];
  }

  get responseContent(): string {
    return this._responseContent;
  }

  toString(): string {
    return `EvaluationRequest{userText='${this._userText}', dataList=${JSON.stringify(this._dataList)}, chatResponse=${this._responseContent}}`;
  }
}
