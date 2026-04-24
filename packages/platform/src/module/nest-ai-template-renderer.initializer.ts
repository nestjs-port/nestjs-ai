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

import { Injectable, type OnModuleInit } from "@nestjs/common";
import { TemplateRendererFactory } from "@nestjs-ai/commons";
import { LoggerFactory } from "@nestjs-port/core";

@Injectable()
export class NestAiTemplateRendererInitializer implements OnModuleInit {
  private readonly _log = LoggerFactory.getLogger(
    NestAiTemplateRendererInitializer.name,
  );

  async onModuleInit(): Promise<void> {
    try {
      const templateStModuleName = "@nestjs-ai/template-st";
      const templateStModule = await import(templateStModuleName);
      TemplateRendererFactory.bind(new templateStModule.StTemplateRenderer());
    } catch (error) {
      this._log.debug(
        "Skipping StringTemplate renderer binding and using the fallback renderer.",
        error,
      );
    }
  }
}
