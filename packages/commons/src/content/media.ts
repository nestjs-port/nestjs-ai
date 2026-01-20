import { v4 as uuidv4 } from "uuid";

/**
 * Common media formats with their MIME types.
 */
export const MediaFormat = {
	// Document formats
	DOC_PDF: "application/pdf",
	DOC_CSV: "text/csv",
	DOC_DOC: "application/msword",
	DOC_DOCX:
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	DOC_XLS: "application/vnd.ms-excel",
	DOC_XLSX: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	DOC_HTML: "text/html",
	DOC_TXT: "text/plain",
	DOC_MD: "text/markdown",

	// Video formats
	VIDEO_MKV: "video/x-matros",
	VIDEO_MOV: "video/quicktime",
	VIDEO_MP4: "video/mp4",
	VIDEO_WEBM: "video/webm",
	VIDEO_FLV: "video/x-flv",
	VIDEO_MPEG: "video/mpeg",
	VIDEO_WMV: "video/x-ms-wmv",
	VIDEO_THREE_GP: "video/3gpp",

	// Image formats
	IMAGE_PNG: "image/png",
	IMAGE_JPEG: "image/jpeg",
	IMAGE_GIF: "image/gif",
	IMAGE_WEBP: "image/webp",
} as const;

export type MediaFormatType = (typeof MediaFormat)[keyof typeof MediaFormat];

/**
 * The Media class represents the data and metadata of a media attachment in a message.
 * It consists of a MIME type, raw data, and optional metadata such as id and name.
 */
export class Media {
	private static readonly NAME_PREFIX = "media-";

	private readonly _id: string | null;
	private readonly _mimeType: string;
	private readonly _data: string | Uint8Array;
	private readonly _name: string;

	private constructor(
		mimeType: string,
		data: string | Uint8Array,
		id: string | null,
		name: string | null,
	) {
		if (!mimeType) {
			throw new Error("MimeType must not be null");
		}
		if (!data) {
			throw new Error("Data must not be null");
		}
		this._mimeType = mimeType;
		this._data = data;
		this._id = id;
		this._name = name ?? Media.generateDefaultName(mimeType);
	}

	private static generateDefaultName(mimeType: string): string {
		const subtype = mimeType.split("/")[1] || "unknown";
		return `${Media.NAME_PREFIX}${subtype}-${uuidv4()}`;
	}

	/**
	 * Create a new Media instance from a URI.
	 */
	static fromUri(mimeType: string, uri: string): Media {
		return new Media(mimeType, uri, null, null);
	}

	/**
	 * Create a new Media instance from binary data.
	 */
	static fromData(mimeType: string, data: Uint8Array): Media {
		return new Media(mimeType, data, null, null);
	}

	/**
	 * Creates a new Media builder.
	 */
	static builder(): MediaBuilder {
		return new MediaBuilder();
	}

	/**
	 * Get the media MIME type.
	 */
	get mimeType(): string {
		return this._mimeType;
	}

	/**
	 * Get the media data object.
	 * @returns a URI string or a Uint8Array
	 */
	get data(): string | Uint8Array {
		return this._data;
	}

	/**
	 * Get the media data as a byte array.
	 */
	getDataAsByteArray(): Uint8Array {
		if (this._data instanceof Uint8Array) {
			return this._data;
		}
		throw new Error("Media data is not a byte array");
	}

	/**
	 * Get the media id.
	 */
	get id(): string | null {
		return this._id;
	}

	/**
	 * Get the media name.
	 */
	get name(): string {
		return this._name;
	}
}

/**
 * Builder class for Media.
 */
export class MediaBuilder {
	private _id: string | null = null;
	private _mimeType: string | null = null;
	private _data: string | Uint8Array | null = null;
	private _name: string | null = null;

	/**
	 * Sets the MIME type for the media object.
	 */
	mimeType(mimeType: string): MediaBuilder {
		if (!mimeType) {
			throw new Error("MimeType must not be null");
		}
		this._mimeType = mimeType;
		return this;
	}

	/**
	 * Sets the media data from binary data.
	 */
	data(data: Uint8Array | string): MediaBuilder {
		if (!data) {
			throw new Error("Data must not be null");
		}
		this._data = data;
		return this;
	}

	/**
	 * Sets the ID for the media object.
	 */
	id(id: string): MediaBuilder {
		this._id = id;
		return this;
	}

	/**
	 * Sets the name for the media object.
	 */
	name(name: string): MediaBuilder {
		this._name = name;
		return this;
	}

	/**
	 * Builds a new Media instance with the configured properties.
	 */
	build(): Media {
		if (!this._mimeType) {
			throw new Error("MimeType must not be null");
		}
		if (!this._data) {
			throw new Error("Data must not be null");
		}
		return Media.builder()
			.mimeType(this._mimeType)
			.data(this._data)
			.id(this._id ?? "")
			.name(this._name ?? "")
			.build();
	}
}

// Fix circular reference in builder
Object.defineProperty(MediaBuilder.prototype, "build", {
	value: function (this: MediaBuilder): Media {
		const mimeType = (this as unknown as { _mimeType: string | null })
			._mimeType;
		const data = (this as unknown as { _data: string | Uint8Array | null })
			._data;
		const id = (this as unknown as { _id: string | null })._id;
		const name = (this as unknown as { _name: string | null })._name;

		if (!mimeType) {
			throw new Error("MimeType must not be null");
		}
		if (!data) {
			throw new Error("Data must not be null");
		}

		// Use reflection to call private constructor
		return Object.assign(Object.create(Media.prototype), {
			_mimeType: mimeType,
			_data: data,
			_id: id,
			_name:
				name ||
				`${Media.NAME_PREFIX}${mimeType.split("/")[1] || "unknown"}-${uuidv4()}`,
		}) as Media;
	},
});
