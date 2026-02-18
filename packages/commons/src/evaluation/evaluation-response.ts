export class EvaluationResponse {
  private readonly _pass: boolean;
  private readonly _score: number;
  private readonly _feedback: string;
  private readonly _metadata: Record<string, unknown>;

  constructor(
    pass: boolean,
    score: number,
    feedback: string,
    metadata: Record<string, unknown>,
  );
  constructor(
    pass: boolean,
    feedback: string,
    metadata: Record<string, unknown>,
  );
  constructor(
    pass: boolean,
    scoreOrFeedback: number | string,
    feedbackOrMetadata: string | Record<string, unknown>,
    metadata?: Record<string, unknown>,
  ) {
    this._pass = pass;
    if (typeof scoreOrFeedback === "number") {
      this._score = scoreOrFeedback;
      this._feedback = feedbackOrMetadata as string;
      this._metadata = { ...(metadata ?? {}) };
      return;
    }

    this._score = 0;
    this._feedback = scoreOrFeedback;
    this._metadata = { ...(feedbackOrMetadata as Record<string, unknown>) };
  }

  get pass(): boolean {
    return this._pass;
  }

  get score(): number {
    return this._score;
  }

  get feedback(): string {
    return this._feedback;
  }

  get metadata(): Record<string, unknown> {
    return { ...this._metadata };
  }

  toString(): string {
    return `EvaluationResponse{pass=${this._pass}, score=${this._score}, feedback='${this._feedback}', metadata=${JSON.stringify(this._metadata)}}`;
  }
}
