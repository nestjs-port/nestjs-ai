/*
 * Copyright 2023-present the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
