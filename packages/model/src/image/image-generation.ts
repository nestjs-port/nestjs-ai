import type { ModelResult } from "../model/model-result.interface.js";
import type { Image } from "./image.js";
import type { ImageGenerationMetadata } from "./image-generation-metadata.js";

export interface ImageGenerationProps {
  image: Image;
  imageGenerationMetadata?: ImageGenerationMetadata | null;
}

export class ImageGeneration implements ModelResult<Image> {
  private readonly _image: Image;
  private readonly _imageGenerationMetadata: ImageGenerationMetadata;

  constructor(props: ImageGenerationProps) {
    this._image = props.image;
    this._imageGenerationMetadata =
      props.imageGenerationMetadata ??
      (null as unknown as ImageGenerationMetadata);
  }

  get output(): Image {
    return this._image;
  }

  get metadata(): ImageGenerationMetadata {
    return this._imageGenerationMetadata;
  }
}
