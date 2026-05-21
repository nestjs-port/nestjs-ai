import type { Model } from "../model/model.interface.js";
import type { ModerationPrompt } from "./moderation-prompt.js";
import type { ModerationResponse } from "./moderation-response.js";

/**
 * The ModerationModel interface defines a generic AI model for moderation. It extends the
 * Model interface to handle the interaction with various types of AI models. It provides
 * a single method, call, which takes a ModerationPrompt as input and returns a
 * ModerationResponse.
 */
export interface ModerationModel extends Model<
  ModerationPrompt,
  ModerationResponse
> {
  call(request: ModerationPrompt): Promise<ModerationResponse>;
}
