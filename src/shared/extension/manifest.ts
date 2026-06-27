export function getExtensionVersion(): string {
	try {
		return chrome?.runtime?.getManifest?.().version ?? '';
	} catch {
		return '';
	}
}
