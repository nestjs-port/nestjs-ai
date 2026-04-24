import { beforeEach } from "vitest";
import { TemplateRendererFactory } from "@nestjs-ai/commons";
import { StTemplateRenderer } from "@nestjs-ai/template-st";

beforeEach(() => {
  TemplateRendererFactory.bind(new StTemplateRenderer());
});
