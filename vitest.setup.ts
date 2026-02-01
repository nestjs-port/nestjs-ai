import { ConsoleLoggerFactory, LoggerFactory } from "@nestjs-ai/commons";

LoggerFactory.bind(new ConsoleLoggerFactory());
