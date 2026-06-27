export function botTokenValidator(botToken: string): boolean {
	const regex = /^\d{8,12}:[A-Za-z0-9_-]{35}$/;
	return regex.test(botToken);
}
