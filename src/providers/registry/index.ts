import { ProviderManager } from './ProviderManager';
import { Danbooru } from '@/providers/strategies/danbooru/Danbooru';
import { Pixiv } from '@/providers/strategies/pixiv/Pixiv';
import { ZeroChan } from '@/providers/strategies/zerochan/ZeroChan';

export const providerManager = new ProviderManager();

providerManager.addProvider(new Danbooru());
providerManager.addProvider(new Pixiv());
providerManager.addProvider(new ZeroChan());
