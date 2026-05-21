/*
 * Copyright 2026-present the original author or authors.
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

import "reflect-metadata";
import type {
  BlobResourceContents,
  ReadResourceRequest,
  ReadResourceResult,
  TextResourceContents,
} from "@modelcontextprotocol/server";
import { ResourceAdapter } from "../../../adapter/resource-adapter.js";
import { McpServerExchange, McpTransportContext } from "@nestjs-ai/mcp-common";
import { MCP_RESOURCE_METADATA_KEY } from "../../../metadata.js";
import type { McpResourceMetadata } from "../../../mcp-resource.js";
import { McpResource } from "../../../mcp-resource.js";
import type { McpResourceMethodArguments } from "../../../mcp-resource.js";
import { McpResourceMethodCallback } from "../mcp-resource-method-callback.js";

/**
 * Example demonstrating how to use the {@link McpResourceMethodCallback} with
 * {@link McpResource} annotations.
 */
export class McpResourceMethodCallbackExample {
  private constructor() {}

  static async main(): Promise<void> {
    const profileProvider = new UserProfileResourceProvider();

    // Map to store the resource handlers
    const resourceHandlers = new Map<
      string,
      (
        exchange: McpServerExchange,
        request: ReadResourceRequest,
      ) => Promise<ReadResourceResult>
    >();

    // Register all methods annotated with @McpResource
    for (const propertyKey of Object.getOwnPropertyNames(
      UserProfileResourceProvider.prototype,
    )) {
      const annotation = Reflect.getMetadata(
        MCP_RESOURCE_METADATA_KEY,
        UserProfileResourceProvider.prototype,
        propertyKey,
      ) as McpResourceMetadata | undefined;

      if (annotation == null) {
        continue;
      }

      try {
        const callback = new McpResourceMethodCallback({
          provider: profileProvider,
          propertyKey,
          resource: ResourceAdapter.asResource(annotation),
        });

        const uriPattern = annotation.uri;

        resourceHandlers.set(uriPattern, (exchange, request) =>
          callback.handle(exchange, request),
        );

        // Print information about URI variables if present
        if (uriPattern.includes("{") && uriPattern.includes("}")) {
          console.log(`  URI Template: ${uriPattern}`);
          console.log(
            `  URI Variables: ${extractUriVariables(uriPattern).join(", ")}`,
          );
        }

        console.log(
          `Registered resource handler for URI pattern: ${uriPattern}`,
        );
        console.log(`  Name: ${annotation.name}`);
        console.log(`  Description: ${annotation.description}`);
        console.log(`  MIME Type: ${annotation.mimeType}`);
        console.log("");
      } catch (error) {
        console.error(
          `Failed to create callback for method ${propertyKey}: ${(error as Error).message}`,
        );
      }
    }

    // Example of using registered handlers
    if (resourceHandlers.size > 0) {
      console.log("\nTesting resource handlers:");

      // Test a handler with a ReadResourceRequest
      await testHandler(
        resourceHandlers,
        "user-profile://john",
        "Standard handler",
      );

      // Test a handler with URI variables
      await testHandler(
        resourceHandlers,
        "user-profile://jane",
        "URI variable handler",
      );

      // Test a handler with multiple URI variables
      await testHandler(
        resourceHandlers,
        "user-attribute://bob/email",
        "Multiple URI variables handler",
      );

      // Test a handler with exchange and URI variable
      await testHandler(
        resourceHandlers,
        "user-profile-exchange://alice",
        "Exchange with URI variable handler",
      );

      // Test additional handlers
      await testHandler(
        resourceHandlers,
        "user-status://john",
        "Status handler",
      );
      await testHandler(
        resourceHandlers,
        "user-location://jane",
        "Location handler",
      );
      await testHandler(
        resourceHandlers,
        "user-connections://bob",
        "Connections handler",
      );
      await testHandler(
        resourceHandlers,
        "user-notifications://alice",
        "Notifications handler",
      );
      await testHandler(
        resourceHandlers,
        "user-avatar://john",
        "Avatar handler",
      );
    }
  }
}

/**
 * Helper method to test a resource handler.
 */
async function testHandler(
  handlers: Map<
    string,
    (
      exchange: McpServerExchange,
      request: ReadResourceRequest,
    ) => Promise<ReadResourceResult>
  >,
  uri: string,
  description: string,
): Promise<void> {
  // Find a handler that matches the URI pattern
  let handler:
    | ((
        exchange: McpServerExchange,
        request: ReadResourceRequest,
      ) => Promise<ReadResourceResult>)
    | null = null;
  for (const [pattern, candidate] of handlers) {
    if (uriMatchesPattern(uri, pattern)) {
      handler = candidate;
      console.log(`\nTesting ${description} with URI pattern: ${pattern}`);
      break;
    }
  }

  if (handler != null) {
    try {
      const exchange = createMockExchange();
      const request: ReadResourceRequest = {
        method: "resources/read",
        params: { uri },
      } as unknown as ReadResourceRequest;

      const result = await handler(exchange, request);

      console.log(`Resource request result for ${uri}:`);
      for (const content of result.contents) {
        if (isTextContent(content)) {
          console.log(`  ${content.text}`);
        } else {
          console.log(`  ${JSON.stringify(content)}`);
        }
      }
    } catch (error) {
      console.log(`Error executing handler: ${(error as Error).message}`);
    }
  } else {
    console.log(`\nNo handler found for URI: ${uri}`);
  }
}

function createMockExchange(): McpServerExchange {
  return Object.assign(Object.create(McpServerExchange.prototype), {
    transportContext: () => McpTransportContext.EMPTY,
  }) as McpServerExchange;
}

function isTextContent(
  content: TextResourceContents | BlobResourceContents,
): content is TextResourceContents {
  return "text" in content;
}

function extractUriVariables(uriTemplate: string): string[] {
  const variables: string[] = [];
  const pattern = /\{([^/]+?)\}/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(uriTemplate)) !== null) {
    if (match[1] != null) {
      variables.push(match[1]);
    }
  }
  return variables;
}

function uriMatchesPattern(uri: string, pattern: string): boolean {
  // If the pattern doesn't contain variables, do a direct comparison
  if (!pattern.includes("{")) {
    return uri === pattern;
  }
  // Convert the pattern to a regex
  let regex = pattern.replace(/\{[^/]+?\}/g, "([^/]+?)");
  regex = regex.replace(/\//g, "\\/");
  return new RegExp(regex).test(uri);
}

class UserProfileResourceProvider {
  private readonly userProfiles: Map<string, Map<string, string>> = new Map();

  constructor() {
    // Initialize with some sample data
    const johnProfile = new Map<string, string>();
    johnProfile.set("name", "John Smith");
    johnProfile.set("email", "john.smith@example.com");
    johnProfile.set("age", "32");
    johnProfile.set("location", "New York");

    const janeProfile = new Map<string, string>();
    janeProfile.set("name", "Jane Doe");
    janeProfile.set("email", "jane.doe@example.com");
    janeProfile.set("age", "28");
    janeProfile.set("location", "London");

    const bobProfile = new Map<string, string>();
    bobProfile.set("name", "Bob Johnson");
    bobProfile.set("email", "bob.johnson@example.com");
    bobProfile.set("age", "45");
    bobProfile.set("location", "Tokyo");

    const aliceProfile = new Map<string, string>();
    aliceProfile.set("name", "Alice Brown");
    aliceProfile.set("email", "alice.brown@example.com");
    aliceProfile.set("age", "36");
    aliceProfile.set("location", "Sydney");

    this.userProfiles.set("john", johnProfile);
    this.userProfiles.set("jane", janeProfile);
    this.userProfiles.set("bob", bobProfile);
    this.userProfiles.set("alice", aliceProfile);
  }

  /**
   * Resource method that takes a ReadResourceRequest parameter and URI variable.
   */
  @McpResource({
    uri: "user-profile://{username}",
    name: "User Profile",
    description: "Provides user profile information for a specific user",
  })
  getUserProfile(args: McpResourceMethodArguments): ReadResourceResult {
    const username = args.uriVariables.username ?? "";
    const profileInfo = formatProfileInfo(
      this.userProfiles.get(username.toLowerCase()) ?? new Map(),
    );

    return {
      contents: [
        {
          uri: args.uri,
          mimeType: "text/plain",
          text: profileInfo,
        },
      ],
    };
  }

  /**
   * Resource method that takes multiple URI variables as parameters.
   */
  @McpResource({
    uri: "user-attribute://{username}/{attribute}",
    name: "User Attribute",
    description: "Provides a specific attribute from a user's profile",
  })
  getUserAttribute(args: McpResourceMethodArguments): ReadResourceResult {
    const username = args.uriVariables.username ?? "";
    const attribute = args.uriVariables.attribute ?? "";
    const profile =
      this.userProfiles.get(username.toLowerCase()) ??
      new Map<string, string>();
    const attributeValue = profile.get(attribute) ?? "Attribute not found";

    return {
      contents: [
        {
          uri: `user-attribute://${username}/${attribute}`,
          mimeType: "text/plain",
          text: `${username}'s ${attribute}: ${attributeValue}`,
        },
      ],
    };
  }

  /**
   * Resource method that takes an exchange and URI variables.
   */
  @McpResource({
    uri: "user-profile-exchange://{username}",
    name: "User Profile with Exchange",
    description:
      "Provides user profile information with server exchange context",
  })
  getProfileWithExchange(args: McpResourceMethodArguments): ReadResourceResult {
    const username = args.uriVariables.username ?? "";
    const profileInfo = formatProfileInfo(
      this.userProfiles.get(username.toLowerCase()) ?? new Map(),
    );

    return {
      contents: [
        {
          uri: `user-profile-exchange://${username}`,
          mimeType: "text/plain",
          text: `Profile with exchange for ${username}: ${profileInfo}`,
        },
      ],
    };
  }

  /**
   * Resource method that takes a String URI variable parameter.
   */
  @McpResource({
    uri: "user-connections://{username}",
    name: "User Connections",
    description: "Provides a list of connections for a specific user",
  })
  getUserConnections(args: McpResourceMethodArguments): string[] {
    const username = args.uriVariables.username ?? "";
    return [
      `${username} is connected with Alice`,
      `${username} is connected with Bob`,
      `${username} is connected with Charlie`,
    ];
  }

  /**
   * Resource method that takes both McpServerExchange, ReadResourceRequest and URI
   * variable parameters.
   */
  @McpResource({
    uri: "user-notifications://{username}",
    name: "User Notifications",
    description: "Provides notifications for a specific user",
  })
  getUserNotifications(
    args: McpResourceMethodArguments,
  ): Array<TextResourceContents | BlobResourceContents> {
    const username = args.uriVariables.username ?? "";
    void username;
    const notifications = generateNotifications();

    return [
      {
        uri: args.uri,
        mimeType: "text/plain",
        text: notifications,
      },
    ];
  }

  /**
   * Resource method that returns a single ResourceContents with TEXT content type.
   */
  @McpResource({
    uri: "user-status://{username}",
    name: "User Status",
    description: "Provides the current status for a specific user",
  })
  getUserStatus(args: McpResourceMethodArguments): TextResourceContents {
    const username = args.uriVariables.username ?? "";
    const status = generateUserStatus(username);

    return {
      uri: args.uri,
      mimeType: "text/plain",
      text: status,
    };
  }

  /**
   * Resource method that returns a single String with TEXT content type.
   */
  @McpResource({
    uri: "user-location://{username}",
    name: "User Location",
    description: "Provides the current location for a specific user",
  })
  getUserLocation(args: McpResourceMethodArguments): string {
    const username = args.uriVariables.username ?? "";
    const profile =
      this.userProfiles.get(username.toLowerCase()) ??
      new Map<string, string>();
    return profile.get("location") ?? "Location not available";
  }

  /**
   * Resource method that returns a single String with BLOB content type. This
   * demonstrates how a String can be treated as binary data.
   */
  @McpResource({
    uri: "user-avatar://{username}",
    name: "User Avatar",
    description: "Provides a base64-encoded avatar image for a specific user",
    mimeType: "image/png",
  })
  getUserAvatar(args: McpResourceMethodArguments): string {
    const username = args.uriVariables.username ?? "";
    return `base64-encoded-avatar-image-for-${username}`;
  }

  // Invalid signatures for compile-time validation only

  // @ts-expect-error @McpResource only supports methods returning ReadResourceResult, TextResourceContents, BlobResourceContents, string, string[], or Promise thereof
  @McpResource({
    uri: "invalid-return-type://{username}",
    name: "Invalid Return Type",
    description: "Invalid return type",
  })
  invalidReturnType(_args: McpResourceMethodArguments): number {
    void _args;

    return 1;
  }

  // @ts-expect-error @McpResource only supports methods returning ReadResourceResult, TextResourceContents, BlobResourceContents, string, string[], or Promise thereof
  @McpResource({
    uri: "invalid-promise-return-type://{username}",
    name: "Invalid Promise Return Type",
    description: "Invalid promise return type",
  })
  async invalidPromiseReturnType(
    _args: McpResourceMethodArguments,
  ): Promise<number> {
    void _args;

    return 1;
  }

  // @ts-expect-error @McpResource only supports methods with a single object parameter
  @McpResource({
    uri: "no-arguments://{username}",
    name: "No Arguments",
    description: "Invalid no argument resource",
  })
  noParameters(): Promise<ReadResourceResult> {
    return Promise.resolve({
      contents: [],
    });
  }

  // @ts-expect-error @McpResource only supports methods with a single object parameter
  @McpResource({
    uri: "wrong-argument-type://{username}",
    name: "Wrong Argument Type",
    description: "Invalid argument type resource",
  })
  wrongArgumentType(_args: string): Promise<ReadResourceResult> {
    void _args;

    return Promise.resolve({
      contents: [],
    });
  }

  // @ts-expect-error @McpResource only supports methods with a single object parameter
  @McpResource({
    uri: "too-many-arguments://{username}",
    name: "Too Many Arguments",
    description: "Invalid too many arguments resource",
  })
  tooManyParameters(
    _args: McpResourceMethodArguments,
    _extra: string,
  ): Promise<ReadResourceResult> {
    void _args;
    void _extra;

    return Promise.resolve({
      contents: [],
    });
  }
}

function formatProfileInfo(profile: Map<string, string>): string {
  if (profile.size === 0) {
    return "User profile not found";
  }
  const lines: string[] = [];
  for (const [key, value] of profile) {
    lines.push(`${key}: ${value}`);
  }
  return lines.join("\n");
}

function generateNotifications(): string {
  return (
    "You have 3 new messages\n" +
    "2 people viewed your profile\n" +
    "You have 1 new connection request"
  );
}

function generateUserStatus(username: string): string {
  if (username === "john") {
    return "Online";
  } else if (username === "jane") {
    return "Away";
  } else if (username === "bob") {
    return "Offline";
  } else if (username === "alice") {
    return "Busy";
  }
  return "Offline";
}

void McpResourceMethodCallbackExample;
