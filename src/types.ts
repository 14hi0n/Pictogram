type Selector = string;

export type TagSelector = {
	label: string;
	selector: Selector;
};

/**
 * Представялет собой селекстры, которые указывают на необходимые элементы
 */
export type Selectors = {
	media: Selector[];
	tags: TagSelector[];
	source: Selector;
};

/**
 * Media Element
 */
export type MediaElement = HTMLImageElement | HTMLVideoElement;
