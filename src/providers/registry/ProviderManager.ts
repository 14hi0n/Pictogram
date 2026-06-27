import { BaseProvider } from '@/providers/interfaces/BaseProvider';

export class ProviderManager {
	private _providers: Map<string, BaseProvider> = new Map();

	public addProvider(provider: BaseProvider): void {
		this._providers.set(provider.getDomain(), provider);
	}

	public getProviderByDomain(domain: string): BaseProvider | null {
		return this._providers.get(domain) || null;
	}

	public getProviderForUrl(href: string): BaseProvider | null {
		let url: URL;
		try { url = new URL(href); } catch { return null; }

		for (const provider of this._providers.values()) {
			if (provider.matches?.(url)) return provider;
		}

		return this._providers.get(url.hostname) ?? null;
	}
}
