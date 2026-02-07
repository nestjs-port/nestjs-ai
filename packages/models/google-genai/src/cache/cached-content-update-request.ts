import assert from "node:assert/strict";
import type { Milliseconds } from "@nestjs-ai/commons";

export interface CachedContentUpdateRequestProps {
	ttl?: Milliseconds;
	expireTime?: Date;
}

export class CachedContentUpdateRequest {
	private readonly _ttl?: Milliseconds;
	private readonly _expireTime?: Date;

	constructor(props: CachedContentUpdateRequestProps) {
		assert(
			props.ttl !== undefined || props.expireTime !== undefined,
			"Either TTL or expire time must be set for update",
		);

		this._ttl = props.ttl;
		this._expireTime = props.expireTime;
	}

	get ttl(): Milliseconds | undefined {
		return this._ttl;
	}

	get expireTime(): Date | undefined {
		return this._expireTime;
	}
}
