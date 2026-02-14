export class ResponseEntity<R, E> {
	private readonly _response: R | null;
	private readonly _entity: E | null;

	constructor(response: R | null, entity: E | null) {
		this._response = response;
		this._entity = entity;
	}

	get response(): R | null {
		return this._response;
	}

	get entity(): E | null {
		return this._entity;
	}
}
