import type { Content } from "./content.interface";
import type { Media } from "./media";

/**
 * Interface for content that includes media attachments.
 */
export interface MediaContent extends Content {
	/**
	 * Get the media associated with the content.
	 * @returns the list of media attachments
	 */
	getMedia(): Media[];
}
