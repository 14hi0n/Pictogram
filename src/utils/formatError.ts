/**
 * Converts an unknown thrown value to a readable string for console logging.
 *
 * Standard Error instances are NOT safely JSON.stringify-able (all properties
 * are non-enumerable - JSON.stringify(new Error('x')) === '{}').
 * This function handles that, plus plain objects, strings, and everything else.
 */
export function formatError(err: unknown): string {
	if (err instanceof Error) {
		return `${err.name}: ${err.message}`;
	}
	if (typeof err === 'string') {
		return err;
	}
	try {
		const json = JSON.stringify(err, null, 2);
		return json === '{}' ? `[object]: ${String(err)}` : json;
	} catch {
		return String(err);
	}
}
