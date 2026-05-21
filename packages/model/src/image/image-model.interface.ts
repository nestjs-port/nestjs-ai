import type { Model } from "../model/model.interface.js";
import type { ImagePrompt } from "./image-prompt.js";
import type { ImageResponse } from "./image-response.js";

export interface ImageModel extends Model<ImagePrompt, ImageResponse> {
  call(prompt: ImagePrompt): Promise<ImageResponse>;
}
