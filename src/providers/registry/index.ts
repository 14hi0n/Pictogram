import { ProviderManager } from './ProviderManager';
import { Danbooru } from '@/providers/strategies/danbooru/Danbooru';
import { Gelbooru } from '@/providers/strategies/gelbooru-engine/Gelbooru';
import { Rule34 } from '@/providers/strategies/gelbooru-engine/Rule34';
import { Yandere } from '@/providers/strategies/yandere/Yandere';
import { Pixiv } from '@/providers/strategies/pixiv/Pixiv';
import { ZeroChan } from '@/providers/strategies/zerochan/ZeroChan';

export const providerManager = new ProviderManager();

providerManager.addProvider(new Danbooru());
providerManager.addProvider(new Gelbooru());
providerManager.addProvider(new Rule34());
providerManager.addProvider(new Yandere());
providerManager.addProvider(new Pixiv());
providerManager.addProvider(new ZeroChan());
