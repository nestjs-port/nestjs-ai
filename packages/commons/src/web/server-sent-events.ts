import { Observable, type Subscriber } from "rxjs";

/**
 * Represents a parsed Server-Sent Event.
 */
export interface ServerSentEvent {
	/** Event type (defaults to 'message' if not specified) */
	type: string;
	/** Event data */
	data: string;
	/** Last event ID (persists across events) */
	lastEventId: string;
	/** Reconnection time in milliseconds (if specified) */
	retry?: number;
}

interface EventBuilder {
	type: string;
	data: string;
	retry?: number;
}

function createEvent(): EventBuilder {
	return {
		type: "",
		data: "",
		retry: undefined,
	};
}

function dispatchEvent(
	event: EventBuilder,
	controller: TransformStreamDefaultController<ServerSentEvent>,
	lastEventId: string,
): void {
	let { data } = event;

	// Remove trailing newline from data (added after each data field)
	if (data.endsWith("\n")) {
		data = data.slice(0, -1);
	}

	// Only dispatch if data is non-empty (per spec)
	if (!data) {
		return;
	}

	controller.enqueue({
		type: event.type || "message", // Default to 'message' if empty (per spec)
		data,
		lastEventId, // Always present, matches browser MessageEvent.lastEventId
		retry: event.retry,
	});
}

function processField(
	line: string,
	event: EventBuilder,
	setLastEventId: (value: string) => void,
): void {
	const colonIndex = line.indexOf(":");

	const field = colonIndex === -1 ? line : line.slice(0, colonIndex);
	let value = colonIndex === -1 ? "" : line.slice(colonIndex + 1);

	// Remove single leading space from value (spec requirement)
	if (value.startsWith(" ")) {
		value = value.slice(1);
	}

	switch (field) {
		case "event": {
			event.type = value;
			break;
		}

		case "data": {
			// Append data with newline (SSE spec allows multiple data fields)
			event.data += `${value}\n`;
			break;
		}

		case "id": {
			// Spec: Ignore field if value contains NULL character
			// Otherwise update the stream-level last event ID (persists across events)
			if (!value.includes("\0")) {
				setLastEventId(value);
			}

			break;
		}

		case "retry": {
			// Spec: Only accept if value consists of only ASCII digits
			if (/^\d+$/.test(value)) {
				event.retry = Number.parseInt(value, 10);
			}

			break;
		}

		default: {
			// Unknown fields are ignored per spec
			// No action needed
			break;
		}
	}
}

/**
 * TransformStream that parses Server-Sent Events.
 *
 * Use this for advanced stream composition or when you have a text stream that's already decoded.
 *
 * @example
 * ```ts
 * import { ServerSentEventTransformStream } from '@nestjs-ai/commons';
 *
 * // Custom pipeline
 * myTextStream
 *     .pipeThrough(new ServerSentEventTransformStream())
 *     .pipeTo(myWritableStream);
 *
 * // With custom decoder
 * response.body
 *     .pipeThrough(new MyCustomDecoderStream())
 *     .pipeThrough(new ServerSentEventTransformStream());
 * ```
 */
export class ServerSentEventTransformStream extends TransformStream<
	string,
	ServerSentEvent
> {
	constructor() {
		let buffer = "";
		let isFirstChunk = true;
		let event = createEvent();
		let lastEventId = ""; // Stream-level state: persists across events

		super({
			transform(
				chunk: string,
				controller: TransformStreamDefaultController<ServerSentEvent>,
			) {
				// ServerSentEventTransformStream expects string chunks (already decoded)
				// Use TextDecoderStream before this if you have bytes
				if (typeof chunk !== "string") {
					throw new TypeError(
						"ServerSentEventTransformStream expects string chunks. Pipe through TextDecoderStream first for byte streams.",
					);
				}

				let text = chunk;

				// Strip BOM from first chunk (spec requires UTF-8 encoding)
				if (isFirstChunk) {
					text = text.replace(/^\uFEFF/, "");
					isFirstChunk = false;
				}

				buffer += text;

				// Process complete lines
				const lines = buffer.split(/\r\n|\r|\n/);

				// Keep incomplete line in buffer
				buffer = lines.pop() ?? "";

				for (const line of lines) {
					// Empty line dispatches the event
					if (line === "") {
						dispatchEvent(event, controller, lastEventId);
						event = createEvent();
						continue;
					}

					// Ignore comments
					if (line.startsWith(":")) {
						continue;
					}

					// Parse and apply field to event
					processField(line, event, (value) => {
						lastEventId = value;
					});
				}
			},

			flush(controller: TransformStreamDefaultController<ServerSentEvent>) {
				// Process any remaining buffer (unless it's a comment)
				if (buffer && !buffer.startsWith(":")) {
					processField(buffer, event, (value) => {
						lastEventId = value;
					});
				}

				// Dispatch final event if it has data
				dispatchEvent(event, controller, lastEventId);
			},
		});
	}
}

/**
 * Parse a Server-Sent Events (SSE) stream from a Response object.
 *
 * @param response - The Response object with a `text/event-stream` body.
 * @returns An Observable that emits parsed SSE events.
 *
 * @example
 * ```ts
 * import { parseServerSentEvents } from '@nestjs-ai/commons';
 *
 * const response = await fetch('https://api.example.com/events');
 *
 * parseServerSentEvents(response).subscribe({
 *     next: (event) => console.log(event.type, event.data),
 *     error: (err) => console.error(err),
 *     complete: () => console.log('Stream complete'),
 * });
 * ```
 */
export function parseServerSentEvents(
	response: Response,
): Observable<ServerSentEvent> {
	if (!response) {
		throw new TypeError("Expected a Response object");
	}

	if (!response.body) {
		throw new TypeError("Expected response to have a body");
	}

	const stream = response.body
		.pipeThrough(new TextDecoderStream())
		.pipeThrough(new ServerSentEventTransformStream());

	return fromReadableStream(stream);
}

/**
 * Convert a ReadableStream to an RxJS Observable.
 *
 * @param stream - The ReadableStream to convert.
 * @returns An Observable that emits each chunk from the stream.
 *
 * @example
 * ```ts
 * import { fromReadableStream, parseServerSentEvents } from '@nestjs-ai/commons';
 *
 * const response = await fetch('https://api.example.com/events');
 * const stream = parseServerSentEvents(response);
 *
 * fromReadableStream(stream).subscribe({
 *     next: (event) => console.log(event.type, event.data),
 *     error: (err) => console.error(err),
 *     complete: () => console.log('Stream complete'),
 * });
 * ```
 */
function fromReadableStream<T>(stream: ReadableStream<T>): Observable<T> {
	return new Observable<T>((subscriber: Subscriber<T>) => {
		const reader = stream.getReader();

		async function read(): Promise<void> {
			try {
				while (true) {
					const { done, value } = await reader.read();

					if (done) {
						subscriber.complete();
						return;
					}

					subscriber.next(value);
				}
			} catch (error) {
				subscriber.error(error);
			}
		}

		read();

		return () => {
			reader.cancel();
		};
	});
}
