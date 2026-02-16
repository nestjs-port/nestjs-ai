import assert from "node:assert/strict";
import { v4 as uuidv4 } from "uuid";

/**
 * Common media formats.
 */
export enum MediaFormat {
  // Document formats
  /** Public constant mime type for {@code application/pdf}. */
  DOC_PDF = "application/pdf",
  /** Public constant mime type for {@code text/csv}. */
  DOC_CSV = "text/csv",
  /** Public constant mime type for {@code application/msword}. */
  DOC_DOC = "application/msword",
  /** Public constant mime type for {@code application/vnd.openxmlformats-officedocument.wordprocessingml.document}. */
  DOC_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  /** Public constant mime type for {@code application/vnd.ms-excel}. */
  DOC_XLS = "application/vnd.ms-excel",
  /** Public constant mime type for {@code application/vnd.openxmlformats-officedocument.spreadsheetml.sheet}. */
  DOC_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  /** Public constant mime type for {@code text/html}. */
  DOC_HTML = "text/html",
  /** Public constant mime type for {@code text/plain}. */
  DOC_TXT = "text/plain",
  /** Public constant mime type for {@code text/markdown}. */
  DOC_MD = "text/markdown",

  // Video formats
  /** Public constant mime type for {@code video/x-matros}. */
  VIDEO_MKV = "video/x-matros",
  /** Public constant mime type for {@code video/quicktime}. */
  VIDEO_MOV = "video/quicktime",
  /** Public constant mime type for {@code video/mp4}. */
  VIDEO_MP4 = "video/mp4",
  /** Public constant mime type for {@code video/webm}. */
  VIDEO_WEBM = "video/webm",
  /** Public constant mime type for {@code video/x-flv}. */
  VIDEO_FLV = "video/x-flv",
  /** Public constant mime type for {@code video/mpeg}. */
  VIDEO_MPEG = "video/mpeg",
  /** Public constant mime type for {@code video/x-ms-wmv}. */
  VIDEO_WMV = "video/x-ms-wmv",
  /** Public constant mime type for {@code video/3gpp}. */
  VIDEO_THREE_GP = "video/3gpp",

  // Audio formats
  /** Public constant mime type for {@code audio/mp3}. */
  AUDIO_MP3 = "audio/mp3",
  /** Public constant mime type for {@code audio/wav}. */
  AUDIO_WAV = "audio/wav",
  /** Public constant mime type for {@code audio/mpeg}. */
  AUDIO_MPEG = "audio/mpeg",
  /** Public constant mime type for {@code audio/ogg}. */
  AUDIO_OGG = "audio/ogg",
  /** Public constant mime type for {@code audio/flac}. */
  AUDIO_FLAC = "audio/flac",
  /** Public constant mime type for {@code audio/webm}. */
  AUDIO_WEBM = "audio/webm",

  // Image formats
  /** Public constant mime type for {@code image/png}. */
  IMAGE_PNG = "image/png",
  /** Public constant mime type for {@code image/jpeg}. */
  IMAGE_JPEG = "image/jpeg",
  /** Public constant mime type for {@code image/gif}. */
  IMAGE_GIF = "image/gif",
  /** Public constant mime type for {@code image/webp}. */
  IMAGE_WEBP = "image/webp",
}

/**
 * A MIME type string. Accepts {@link MediaFormat} enum values with IDE autocomplete,
 * as well as arbitrary MIME type strings.
 */
export type MimeType = MediaFormat | (string & {});

/**
 * Options for creating a Media instance.
 */
export interface MediaOptionsProps {
  /**
   * The media MIME type.
   */
  mimeType: MimeType;
  /**
   * The media data as binary array or string.
   */
  data: unknown;
  /**
   * The media id, usually defined when the model returns a reference to
   * media it has been passed.
   */
  id?: string | null;
  /**
   * The name of the media object that can be referenced by the AI model.
   *
   * Important security note: This field is vulnerable to prompt injections, as the
   * model might inadvertently interpret it as instructions. It is recommended to
   * specify neutral names.
   *
   * The name must only contain:
   * - Alphanumeric characters
   * - Whitespace characters (no more than one in a row)
   * - Hyphens
   * - Parentheses
   * - Square brackets
   */
  name?: string | null;
}

/**
 * The Media class represents the data and metadata of a media attachment in a message.
 * It consists of a MIME type, raw data, and optional metadata such as id and name.
 *
 * Media objects can be used in the UserMessage class to attach various types of content
 * like images, documents, or videos. When interacting with AI models, the id and name
 * fields help track and reference specific media objects.
 *
 * The id field is typically assigned by AI models when they reference previously provided media.
 *
 * The name field can be used to provide a descriptive identifier to the model, though
 * care should be taken to avoid prompt injection vulnerabilities. For Amazon AWS the name
 * must only contain:
 * - Alphanumeric characters
 * - Whitespace characters (no more than one in a row)
 * - Hyphens
 * - Parentheses
 * - Square brackets
 *
 * Note, this class does not directly enforce that restriction.
 *
 * If no name is provided, one will be automatically generated using the pattern:
 * `media-{mimeType.subtype}-{UUID}`
 */
export class Media {
  private static readonly NAME_PREFIX = "media-";

  /**
   * An Id of the media object, usually defined when the model returns a reference to
   * media it has been passed.
   */
  private readonly _id: string | null;

  private readonly _mimeType: MimeType;

  private readonly _data: unknown;

  private readonly _name: string;

  /**
   * Create a new Media instance.
   * @param options the media options containing mimeType and data
   */
  constructor(options: MediaOptionsProps) {
    const { mimeType, data, id, name } = options;

    assert(mimeType, "MimeType must not be null");

    assert(data, "Data must not be null");

    this._mimeType = mimeType;
    this._data = data;
    this._id = id ?? null;
    this._name = name ?? Media.generateDefaultName(mimeType);
  }

  private static generateDefaultName(mimeType: string): string {
    const subtype = mimeType.split("/")[1] || "unknown";
    return `${Media.NAME_PREFIX}${subtype}-${uuidv4()}`;
  }

  /**
   * Get the media MIME type.
   * @returns the media MIME type
   */
  get mimeType(): MimeType {
    return this._mimeType;
  }

  /**
   * Get the media data object.
   * @returns a URI string or a Uint8Array
   */
  get data(): unknown {
    return this._data;
  }

  /**
   * Get the media data as a byte array.
   * @returns the media data as a byte array
   * @throws Error if the media data is not a Buffer
   */
  get dataAsByteArray(): Buffer {
    if (Buffer.isBuffer(this._data)) {
      return this._data;
    }
    throw new Error("Media data is not a buffer");
  }

  /**
   * Get the media id.
   * @returns the media id
   */
  get id(): string | null {
    return this._id;
  }

  /**
   * Get the media name.
   * @returns the media name
   */
  get name(): string {
    return this._name;
  }
}
