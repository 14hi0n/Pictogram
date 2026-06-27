import { BaseProvider, ProviderMediaTarget } from './BaseProvider';

export type { ProviderMediaTarget };

export interface SPAProvider extends BaseProvider {
	findAnchorElement(): Element | null;
	findMediaTargets?(): ProviderMediaTarget[];
}
