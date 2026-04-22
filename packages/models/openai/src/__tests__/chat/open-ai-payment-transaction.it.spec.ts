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

import { ChatClient, SimpleLoggerAdvisor } from "@nestjs-ai/client-chat";
import {
  BeanOutputConverter,
  FunctionToolCallback,
  type ToolCallback,
} from "@nestjs-ai/model";
import { LoggerFactory, LogLevel } from "@nestjs-port/core";
import { ConsoleLoggerFactory } from "@nestjs-port/testing";
import { lastValueFrom, toArray } from "rxjs";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { OpenAiChatModel } from "../../open-ai-chat-model";
import { OpenAiChatOptions } from "../../open-ai-chat-options";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface Transaction extends Record<string, unknown> {
  id: string;
}

interface Status {
  name: string;
}

interface Transactions extends Record<string, unknown> {
  transactions: Transaction[];
}

interface Statuses {
  statuses: Status[];
}

const DATASET = new Map<string, Status>([
  ["001", { name: "pending" }],
  ["002", { name: "approved" }],
  ["003", { name: "rejected" }],
]);

const paymentStatusInputType = z.object({ id: z.string() });
const paymentStatusesInputType = z.object({
  transactions: z.array(z.object({ id: z.string() })),
});

const TransactionStatusResponseSchema = z.array(
  z.object({
    id: z.string(),
    status: z.string(),
  }),
);

function paymentStatusCallback(): ToolCallback {
  return FunctionToolCallback.builder<Transaction, Status>(
    "paymentStatus",
    (transaction) => DATASET.get(transaction.id) ?? { name: "unknown" },
  )
    .description("Get the status of a single payment transaction")
    .inputType(paymentStatusInputType)
    .build();
}

function paymentStatusesCallback(): ToolCallback {
  return FunctionToolCallback.builder<Transactions, Statuses>(
    "paymentStatuses",
    (transactions) => ({
      statuses: transactions.transactions.map(
        (t) => DATASET.get(t.id) ?? { name: "unknown" },
      ),
    }),
  )
    .description("Get the list statuses of a list of payment transactions")
    .inputType(paymentStatusesInputType)
    .build();
}

function buildChatClient(toolCallback: ToolCallback): ChatClient {
  const chatModel = new OpenAiChatModel({
    options: OpenAiChatOptions.builder()
      .apiKey(OPENAI_API_KEY ?? "")
      .model("gpt-4o-mini")
      .temperature(0.1)
      .toolCallbacks([toolCallback])
      .build(),
  });
  return ChatClient.builder(chatModel).build();
}

describe.skipIf(!OPENAI_API_KEY)("OpenAiPaymentTransaction", () => {
  LoggerFactory.bind(new ConsoleLoggerFactory(LogLevel.DEBUG));
  LoggerFactory.getLogger("OpenAiPaymentTransactionIT");

  it.each([
    ["paymentStatus", paymentStatusCallback()],
    ["paymentStatuses", paymentStatusesCallback()],
  ] as const)("transaction payment statuses: %s", async (_name, callback) => {
    const chatClient = buildChatClient(callback);

    const content = await chatClient
      .prompt()
      .advisors(new SimpleLoggerAdvisor())
      .user(`What is the status of my payment transactions 001, 002 and 003?\n`)
      .call()
      .entity(TransactionStatusResponseSchema);

    expect(content).not.toBeNull();
    if (content == null) {
      throw new Error("Expected entity content to be non-null");
    }
    expect(content[0]?.id).toBe("001");
    expect(content[0]?.status).toBe("pending");

    expect(content[1]?.id).toBe("002");
    expect(content[1]?.status).toBe("approved");

    expect(content[2]?.id).toBe("003");
    expect(content[2]?.status).toBe("rejected");
  });

  it.each([
    ["paymentStatus", paymentStatusCallback()],
    ["paymentStatuses", paymentStatusesCallback()],
  ] as const)("streaming payment statuses: %s", async (_name, callback) => {
    const chatClient = buildChatClient(callback);

    const converter = new BeanOutputConverter({
      schema: TransactionStatusResponseSchema,
    });

    const flux = chatClient
      .prompt()
      .advisors(new SimpleLoggerAdvisor())
      .user(
        `What is the status of my payment transactions 001, 002 and 003?\n\n${converter.format}\n`,
      )
      .stream()
      .content();

    const content = (await lastValueFrom(flux.pipe(toArray()))).join("");

    const structure = converter.convert(content);
    expect(structure).not.toBeNull();
    if (structure == null) {
      throw new Error("Expected converted structure to be non-null");
    }

    expect(structure[0]?.id).toBe("001");
    expect(structure[0]?.status).toBe("pending");

    expect(structure[1]?.id).toBe("002");
    expect(structure[1]?.status).toBe("approved");

    expect(structure[2]?.id).toBe("003");
    expect(structure[2]?.status).toBe("rejected");
  });
});
