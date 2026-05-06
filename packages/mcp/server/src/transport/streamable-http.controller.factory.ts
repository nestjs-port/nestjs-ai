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

import type { IncomingMessage, ServerResponse } from "node:http";
import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Post,
  Req,
  Res,
  type Type,
} from "@nestjs/common";
import { McpServerStreamableHttpService } from "./streamable-http.service.js";

interface RawHttp {
  req: IncomingMessage;
  res: ServerResponse;
}

function getRawHttp(req: unknown, res: unknown): RawHttp {
  const rawReq = ((req as { raw?: IncomingMessage }).raw ??
    req) as IncomingMessage;
  const rawRes = ((res as { raw?: ServerResponse }).raw ??
    res) as ServerResponse;
  return { req: rawReq, res: rawRes };
}

function normalizeEndpoint(endpoint: string): string {
  return endpoint.replace(/^\/+/, "").replace(/\/+$/, "");
}

export function createStreamableHttpController(
  endpoint: string,
): Type<unknown> {
  const path = normalizeEndpoint(endpoint);

  @Controller()
  class McpStreamableHttpController {
    constructor(
      @Inject(McpServerStreamableHttpService)
      private readonly streamableHttpService: McpServerStreamableHttpService,
    ) {}

    @Post(path)
    async handlePost(
      @Req() req: unknown,
      @Res() res: unknown,
      @Body() body: unknown,
    ): Promise<void> {
      const raw = getRawHttp(req, res);
      await this.streamableHttpService.handleRequest(raw.req, raw.res, body);
    }

    @Get(path)
    async handleGet(@Req() req: unknown, @Res() res: unknown): Promise<void> {
      const raw = getRawHttp(req, res);
      await this.streamableHttpService.handleRequest(raw.req, raw.res);
    }

    @Delete(path)
    async handleDelete(
      @Req() req: unknown,
      @Res() res: unknown,
    ): Promise<void> {
      const raw = getRawHttp(req, res);
      await this.streamableHttpService.handleRequest(raw.req, raw.res);
    }
  }

  return McpStreamableHttpController;
}
