import { Media, MediaFormat, type MimeType } from "@nestjs-ai/commons";
import { AssistantMessage, UserMessage } from "@nestjs-ai/model";
import {
  RedisContainer,
  type StartedRedisContainer,
} from "@testcontainers/redis";
import { createClient, type RedisClientType } from "redis";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { RedisChatMemoryConfig } from "../redis-chat-memory-config";
import { RedisChatMemoryRepository } from "../redis-chat-memory-repository";

describe("RedisChatMemoryMediaIT", () => {
  let redisContainer: StartedRedisContainer | null;
  let client: RedisClientType;
  let chatMemory: RedisChatMemoryRepository;

  beforeAll(async () => {
    redisContainer = await new RedisContainer(
      "redis/redis-stack:latest",
    ).start();
    const redisUrl = redisContainer.getConnectionUrl();

    client = createClient({ url: redisUrl }) as RedisClientType;
    await client.connect();
  }, 120_000);

  beforeEach(async () => {
    chatMemory = await RedisChatMemoryRepository.builder()
      .client(client)
      .indexName(`test-media-${RedisChatMemoryConfig.DEFAULT_INDEX_NAME}`)
      .build();

    // Clear any existing data
    for (const conversationId of await chatMemory.findConversationIds()) {
      await chatMemory.clear(conversationId);
    }
  });

  afterAll(async () => {
    if (!client) {
      return;
    }

    await client.close();
    await redisContainer?.stop();
  }, 60_000);

  it("should store and retrieve user message with uri media", async () => {
    // Create a URI media object
    const mediaUri = new URL("https://example.com/image.png");
    const imageMedia = new Media({
      mimeType: MediaFormat.IMAGE_PNG,
      data: mediaUri,
      id: "test-image-id",
      name: "test-image",
    });

    // Create a user message with the media
    const userMessage = new UserMessage({
      content: "Message with image",
      media: [imageMedia],
      properties: { "test-key": "test-value" },
    });

    // Store the message
    await chatMemory.add("test-conversation", userMessage);

    // Retrieve the message
    const messages = await chatMemory.get("test-conversation", 10);

    expect(messages).toHaveLength(1);
    expect(messages[0]).toBeInstanceOf(UserMessage);

    const retrievedMessage = messages[0] as UserMessage;
    expect(retrievedMessage.text).toBe("Message with image");
    expect(retrievedMessage.metadata).toHaveProperty("test-key", "test-value");

    // Verify media content
    expect(retrievedMessage.media).toHaveLength(1);
    const retrievedMedia = retrievedMessage.media[0];
    expect(retrievedMedia?.mimeType).toBe(MediaFormat.IMAGE_PNG);
    expect(retrievedMedia?.id).toBe("test-image-id");
    expect(retrievedMedia?.name).toBe("test-image");
    expect(retrievedMedia?.data).toBe(mediaUri.toString());
  });

  it("should store and retrieve assistant message with byte array media", async () => {
    // Create a byte array media object
    const imageData = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04]);
    const byteArrayMedia = new Media({
      mimeType: MediaFormat.IMAGE_JPEG,
      data: imageData,
      id: "test-jpeg-id",
      name: "test-jpeg",
    });

    // Create a list of tool calls
    const toolCalls = [
      {
        id: "tool1",
        type: "function",
        name: "testFunction",
        arguments: '{"param":"value"}',
      },
    ];

    // Create an assistant message with media and tool calls
    const assistantMessage = new AssistantMessage({
      content: "Response with image",
      properties: { "assistant-key": "assistant-value" },
      toolCalls,
      media: [byteArrayMedia],
    });

    // Store the message
    await chatMemory.add("test-conversation", assistantMessage);

    // Retrieve the message
    const messages = await chatMemory.get("test-conversation", 10);

    expect(messages).toHaveLength(1);
    expect(messages[0]).toBeInstanceOf(AssistantMessage);

    const retrievedMessage = messages[0] as AssistantMessage;
    expect(retrievedMessage.text).toBe("Response with image");
    expect(retrievedMessage.metadata).toHaveProperty(
      "assistant-key",
      "assistant-value",
    );

    // Verify tool calls
    expect(retrievedMessage.toolCalls).toHaveLength(1);
    const retrievedToolCall = retrievedMessage.toolCalls[0];
    expect(retrievedToolCall?.id).toBe("tool1");
    expect(retrievedToolCall?.type).toBe("function");
    expect(retrievedToolCall?.name).toBe("testFunction");
    expect(retrievedToolCall?.arguments).toBe('{"param":"value"}');

    // Verify media content
    expect(retrievedMessage.media).toHaveLength(1);
    const retrievedMedia = retrievedMessage.media[0];
    expect(retrievedMedia?.mimeType).toBe(MediaFormat.IMAGE_JPEG);
    expect(retrievedMedia?.id).toBe("test-jpeg-id");
    expect(retrievedMedia?.name).toBe("test-jpeg");
    expect(retrievedMedia?.dataAsByteArray).toEqual(imageData);
  });

  it("should store and retrieve multiple messages with different media types", async () => {
    // Create media objects with different types
    const pngMedia = new Media({
      mimeType: MediaFormat.IMAGE_PNG,
      data: new URL("https://example.com/image.png"),
      id: "png-id",
    });

    const jpegMedia = new Media({
      mimeType: MediaFormat.IMAGE_JPEG,
      data: Buffer.from([0x10, 0x20, 0x30, 0x40]),
      id: "jpeg-id",
    });

    const pdfMedia = new Media({
      mimeType: MediaFormat.DOC_PDF,
      data: Buffer.from("PDF content"),
      id: "pdf-id",
    });

    // Create messages
    const userMessage1 = new UserMessage({
      content: "Message with PNG",
      media: [pngMedia],
    });

    const assistantMessage = new AssistantMessage({
      content: "Response with JPEG",
      properties: {},
      toolCalls: [],
      media: [jpegMedia],
    });

    const userMessage2 = new UserMessage({
      content: "Message with PDF",
      media: [pdfMedia],
    });

    // Store all messages
    await chatMemory.add("media-conversation", [
      userMessage1,
      assistantMessage,
      userMessage2,
    ]);

    // Retrieve the messages
    const messages = await chatMemory.get("media-conversation", 10);

    expect(messages).toHaveLength(3);

    // Verify first user message with PNG
    const retrievedUser1 = messages[0] as UserMessage;
    expect(retrievedUser1.text).toBe("Message with PNG");
    expect(retrievedUser1.media).toHaveLength(1);
    expect(retrievedUser1.media[0]?.mimeType).toBe(MediaFormat.IMAGE_PNG);
    expect(retrievedUser1.media[0]?.id).toBe("png-id");
    expect(retrievedUser1.media[0]?.data).toBe("https://example.com/image.png");

    // Verify assistant message with JPEG
    const retrievedAssistant = messages[1] as AssistantMessage;
    expect(retrievedAssistant.text).toBe("Response with JPEG");
    expect(retrievedAssistant.media).toHaveLength(1);
    expect(retrievedAssistant.media[0]?.mimeType).toBe(MediaFormat.IMAGE_JPEG);
    expect(retrievedAssistant.media[0]?.id).toBe("jpeg-id");
    expect(retrievedAssistant.media[0]?.dataAsByteArray).toEqual(
      Buffer.from([0x10, 0x20, 0x30, 0x40]),
    );

    // Verify second user message with PDF
    const retrievedUser2 = messages[2] as UserMessage;
    expect(retrievedUser2.text).toBe("Message with PDF");
    expect(retrievedUser2.media).toHaveLength(1);
    expect(retrievedUser2.media[0]?.mimeType).toBe(MediaFormat.DOC_PDF);
    expect(retrievedUser2.media[0]?.id).toBe("pdf-id");
    // Data should be a byte array from the ByteArrayResource
    expect(retrievedUser2.media[0]?.dataAsByteArray).toEqual(
      Buffer.from("PDF content"),
    );
  });

  it("should store and retrieve message with multiple media", async () => {
    // Create multiple media objects
    const textMedia = new Media({
      mimeType: MediaFormat.DOC_TXT,
      data: Buffer.from("This is text content"),
      id: "text-id",
      name: "text-file",
    });

    const imageMedia = new Media({
      mimeType: MediaFormat.IMAGE_PNG,
      data: new URL("https://example.com/image.png"),
      id: "image-id",
      name: "image-file",
    });

    // Create a message with multiple media attachments
    const userMessage = new UserMessage({
      content: "Message with multiple attachments",
      media: [textMedia, imageMedia],
    });

    // Store the message
    await chatMemory.add("multi-media-conversation", userMessage);

    // Retrieve the message
    const messages = await chatMemory.get("multi-media-conversation", 10);

    expect(messages).toHaveLength(1);
    const retrievedMessage = messages[0] as UserMessage;
    expect(retrievedMessage.text).toBe("Message with multiple attachments");

    // Verify multiple media contents
    const retrievedMedia = retrievedMessage.media;
    expect(retrievedMedia).toHaveLength(2);

    // The media should be retrieved in the same order
    const retrievedTextMedia = retrievedMedia[0];
    expect(retrievedTextMedia?.mimeType).toBe(MediaFormat.DOC_TXT);
    expect(retrievedTextMedia?.id).toBe("text-id");
    expect(retrievedTextMedia?.name).toBe("text-file");
    expect(retrievedTextMedia?.dataAsByteArray).toEqual(
      Buffer.from("This is text content"),
    );

    const retrievedImageMedia = retrievedMedia[1];
    expect(retrievedImageMedia?.mimeType).toBe(MediaFormat.IMAGE_PNG);
    expect(retrievedImageMedia?.id).toBe("image-id");
    expect(retrievedImageMedia?.name).toBe("image-file");
    expect(retrievedImageMedia?.data).toBe("https://example.com/image.png");
  });

  it("should clear conversation with media", async () => {
    // Create a message with media
    const imageMedia = new Media({
      mimeType: MediaFormat.IMAGE_PNG,
      data: Buffer.from([0x01, 0x02, 0x03]),
      id: "test-clear-id",
    });

    const userMessage = new UserMessage({
      content: "Message to be cleared",
      media: [imageMedia],
    });

    // Store the message
    const conversationId = "conversation-to-clear";
    await chatMemory.add(conversationId, userMessage);

    // Verify it was stored
    expect(await chatMemory.get(conversationId, 10)).toHaveLength(1);

    // Clear the conversation
    await chatMemory.clear(conversationId);

    // Verify it was cleared
    expect(await chatMemory.get(conversationId, 10)).toHaveLength(0);
    expect(await chatMemory.findConversationIds()).not.toContain(
      conversationId,
    );
  });

  it("should handle large binary data", async () => {
    // Create a larger binary payload (around 50KB)
    const largeImageData = Buffer.alloc(50 * 1024);
    // Fill with a recognizable pattern for verification
    for (let i = 0; i < largeImageData.length; i++) {
      largeImageData[i] = i % 256;
    }

    // Create media with the large data
    const largeMedia = new Media({
      mimeType: MediaFormat.IMAGE_PNG,
      data: largeImageData,
      id: "large-image-id",
      name: "large-image.png",
    });

    // Create a message with large media
    const userMessage = new UserMessage({
      content: "Message with large image attachment",
      media: [largeMedia],
    });

    // Store the message
    const conversationId = "large-media-conversation";
    await chatMemory.add(conversationId, userMessage);

    // Retrieve the message
    const messages = await chatMemory.get(conversationId, 10);

    // Verify
    expect(messages).toHaveLength(1);
    const retrievedMessage = messages[0] as UserMessage;
    expect(retrievedMessage.media).toHaveLength(1);

    // Verify the large binary data was preserved exactly
    const retrievedMedia = retrievedMessage.media[0];
    expect(retrievedMedia?.mimeType).toBe(MediaFormat.IMAGE_PNG);
    const retrievedData = retrievedMedia?.dataAsByteArray;
    expect(retrievedData).toHaveLength(50 * 1024);
    expect(retrievedData).toEqual(largeImageData);
  });

  it("should handle media with empty or null values", async () => {
    // Create media with null or empty values where allowed
    const edgeCaseMedia1 = new Media({
      mimeType: MediaFormat.IMAGE_PNG, // MimeType is required
      data: Buffer.alloc(0), // Empty byte array
      id: null, // No ID
      name: "", // Empty name
    });

    // Second media with only required fields
    const edgeCaseMedia2 = new Media({
      mimeType: MediaFormat.DOC_TXT, // Only required field
      data: Buffer.alloc(0), // Empty byte array instead of null
    });

    // Create message with these edge case media objects
    const userMessage = new UserMessage({
      content: "Edge case media test",
      media: [edgeCaseMedia1, edgeCaseMedia2],
    });

    // Store the message
    const conversationId = "edge-case-media";
    await chatMemory.add(conversationId, userMessage);

    // Retrieve the message
    const messages = await chatMemory.get(conversationId, 10);

    // Verify the message was stored and retrieved
    expect(messages).toHaveLength(1);
    const retrievedMessage = messages[0] as UserMessage;

    // Verify the media objects
    const retrievedMedia = retrievedMessage.media;
    expect(retrievedMedia).toHaveLength(2);

    // Check first media with empty/null values
    const firstMedia = retrievedMedia[0];
    expect(firstMedia?.mimeType).toBe(MediaFormat.IMAGE_PNG);
    expect(firstMedia?.dataAsByteArray).not.toBeNull();
    expect(firstMedia?.dataAsByteArray).toHaveLength(0);
    expect(firstMedia?.id).toBeNull();
    expect(firstMedia?.name).toBe("");

    // Check second media with only required field
    const secondMedia = retrievedMedia[1];
    expect(secondMedia?.mimeType).toBe(MediaFormat.DOC_TXT);
    expect(secondMedia?.dataAsByteArray).not.toBeNull();
    expect(secondMedia?.dataAsByteArray).toHaveLength(0);
    expect(secondMedia?.id).toBeNull();
    expect(secondMedia?.name).not.toBeNull();
  });

  it("should handle complex binary data types", async () => {
    // Create audio sample data (simple WAV header + sine wave)
    const audioData = createSampleAudioData(8000, 2); // 2 seconds of 8kHz audio

    // Create video sample data (mock MP4 data with recognizable pattern)
    const videoData = createSampleVideoData(10 * 1024); // 10KB mock video data

    // Create custom MIME types for specialized formats
    const customAudioType: MimeType = "audio/wav";
    const customVideoType: MimeType = "video/mp4";

    // Create media objects with the complex binary data
    const audioMedia = new Media({
      mimeType: customAudioType,
      data: audioData,
      id: "audio-sample-id",
      name: "audio-sample.wav",
    });

    const videoMedia = new Media({
      mimeType: customVideoType,
      data: videoData,
      id: "video-sample-id",
      name: "video-sample.mp4",
    });

    // Create messages with the complex media
    const userMessage = new UserMessage({
      content: "Message with audio attachment",
      media: [audioMedia],
    });

    const assistantMessage = new AssistantMessage({
      content: "Response with video attachment",
      properties: {},
      toolCalls: [],
      media: [videoMedia],
    });

    // Store the messages
    const conversationId = "complex-media-conversation";
    await chatMemory.add(conversationId, [userMessage, assistantMessage]);

    // Retrieve the messages
    const messages = await chatMemory.get(conversationId, 10);

    // Verify
    expect(messages).toHaveLength(2);

    // Verify audio data in user message
    const retrievedUserMessage = messages[0] as UserMessage;
    expect(retrievedUserMessage.text).toBe("Message with audio attachment");
    expect(retrievedUserMessage.media).toHaveLength(1);

    const retrievedAudioMedia = retrievedUserMessage.media[0];
    expect(retrievedAudioMedia?.mimeType.toString()).toBe(customAudioType);
    expect(retrievedAudioMedia?.id).toBe("audio-sample-id");
    expect(retrievedAudioMedia?.name).toBe("audio-sample.wav");
    expect(retrievedAudioMedia?.dataAsByteArray).toEqual(audioData);

    // Verify binary pattern data integrity
    const retrievedAudioData =
      retrievedAudioMedia?.dataAsByteArray ?? Buffer.alloc(0);
    // Check RIFF header (first 4 bytes of WAV)
    expect(retrievedAudioData.subarray(0, 4)).toEqual(
      Buffer.from([0x52, 0x49, 0x46, 0x46]),
    );

    // Verify video data in assistant message
    const retrievedAssistantMessage = messages[1] as AssistantMessage;
    expect(retrievedAssistantMessage.text).toBe(
      "Response with video attachment",
    );
    expect(retrievedAssistantMessage.media).toHaveLength(1);

    const retrievedVideoMedia = retrievedAssistantMessage.media[0];
    expect(retrievedVideoMedia?.mimeType.toString()).toBe(customVideoType);
    expect(retrievedVideoMedia?.id).toBe("video-sample-id");
    expect(retrievedVideoMedia?.name).toBe("video-sample.mp4");
    expect(retrievedVideoMedia?.dataAsByteArray).toEqual(videoData);

    // Verify the MP4 header pattern
    const retrievedVideoData =
      retrievedVideoMedia?.dataAsByteArray ?? Buffer.alloc(0);
    // Check mock MP4 signature (first 4 bytes should be ftyp)
    expect(retrievedVideoData.subarray(4, 8)).toEqual(
      Buffer.from([0x66, 0x74, 0x79, 0x70]),
    );
  });
});

/**
 * Creates a sample audio data byte array with WAV format.
 * @param sampleRate Sample rate of the audio in Hz
 * @param durationSeconds Duration of the audio in seconds
 * @return Byte array containing a simple WAV file
 */
function createSampleAudioData(
  sampleRate: number,
  durationSeconds: number,
): Buffer {
  // Calculate sizes
  const headerSize = 44; // Standard WAV header size
  const dataSize = sampleRate * durationSeconds; // 1 byte per sample, mono
  const totalSize = headerSize + dataSize;

  const audioData = Buffer.alloc(totalSize);

  // Write WAV header (RIFF chunk)
  audioData[0] = 0x52;
  audioData[1] = 0x49;
  audioData[2] = 0x46;
  audioData[3] = 0x46;

  // File size - 8 (4 bytes little endian)
  const fileSizeMinus8 = totalSize - 8;
  audioData[4] = fileSizeMinus8 & 0xff;
  audioData[5] = (fileSizeMinus8 >> 8) & 0xff;
  audioData[6] = (fileSizeMinus8 >> 16) & 0xff;
  audioData[7] = (fileSizeMinus8 >> 24) & 0xff;

  // WAVE chunk
  audioData[8] = 0x57;
  audioData[9] = 0x41;
  audioData[10] = 0x56;
  audioData[11] = 0x45;

  // fmt chunk
  audioData[12] = 0x66;
  audioData[13] = 0x6d;
  audioData[14] = 0x74;
  audioData[15] = 0x20;

  // fmt chunk size (16 for PCM)
  audioData[16] = 16;
  audioData[17] = 0;
  audioData[18] = 0;
  audioData[19] = 0;

  // Audio format (1 = PCM)
  audioData[20] = 1;
  audioData[21] = 0;

  // Channels (1 = mono)
  audioData[22] = 1;
  audioData[23] = 0;

  // Sample rate
  audioData[24] = sampleRate & 0xff;
  audioData[25] = (sampleRate >> 8) & 0xff;
  audioData[26] = (sampleRate >> 16) & 0xff;
  audioData[27] = (sampleRate >> 24) & 0xff;

  // Byte rate (SampleRate * NumChannels * BitsPerSample/8)
  const byteRate = (sampleRate * 1 * 8) / 8;
  audioData[28] = byteRate & 0xff;
  audioData[29] = (byteRate >> 8) & 0xff;
  audioData[30] = (byteRate >> 16) & 0xff;
  audioData[31] = (byteRate >> 24) & 0xff;

  // Block align (NumChannels * BitsPerSample/8)
  audioData[32] = 1;
  audioData[33] = 0;

  // Bits per sample
  audioData[34] = 8;
  audioData[35] = 0;

  // Data chunk
  audioData[36] = 0x64;
  audioData[37] = 0x61;
  audioData[38] = 0x74;
  audioData[39] = 0x61;

  // Data size
  audioData[40] = dataSize & 0xff;
  audioData[41] = (dataSize >> 8) & 0xff;
  audioData[42] = (dataSize >> 16) & 0xff;
  audioData[43] = (dataSize >> 24) & 0xff;

  // Generate a simple sine wave for audio data
  for (let i = 0; i < dataSize; i++) {
    // Simple sine wave pattern (0-255)
    audioData[headerSize + i] = Math.trunc(
      128 + 127 * Math.sin((2 * Math.PI * 440 * i) / sampleRate),
    );
  }

  return audioData;
}

/**
 * Creates sample video data with a mock MP4 structure.
 * @param sizeBytes Size of the video data in bytes
 * @return Byte array containing mock MP4 data
 */
function createSampleVideoData(sizeBytes: number): Buffer {
  const videoData = Buffer.alloc(sizeBytes);

  // Write MP4 header
  // First 4 bytes: size of the first atom
  const firstAtomSize = 24; // Standard size for ftyp atom
  videoData[0] = 0;
  videoData[1] = 0;
  videoData[2] = 0;
  videoData[3] = firstAtomSize;

  // Next 4 bytes: ftyp (file type atom)
  videoData[4] = 0x66;
  videoData[5] = 0x74;
  videoData[6] = 0x79;
  videoData[7] = 0x70;

  // Major brand (mp42)
  videoData[8] = 0x6d;
  videoData[9] = 0x70;
  videoData[10] = 0x34;
  videoData[11] = 0x32;

  // Minor version
  videoData[12] = 0;
  videoData[13] = 0;
  videoData[14] = 0;
  videoData[15] = 1;

  // Compatible brands (mp42, mp41)
  videoData[16] = 0x6d;
  videoData[17] = 0x70;
  videoData[18] = 0x34;
  videoData[19] = 0x32;
  videoData[20] = 0x6d;
  videoData[21] = 0x70;
  videoData[22] = 0x34;
  videoData[23] = 0x31;

  // Fill the rest with a recognizable pattern
  for (let i = firstAtomSize; i < sizeBytes; i++) {
    // Create a repeating pattern with some variation
    videoData[i] = (i % 64) + (Math.floor(i / 64) % 64);
  }

  return videoData;
}
