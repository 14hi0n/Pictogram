type ErrorCause = string | Error | unknown;

class CustomError<T extends ErrorCause> extends Error {
	public cause: T;

	constructor(message: string, cause: T, asserter: Function = CustomError) {
		super(message);
		this.name = this.constructor.name;
		this.cause = cause;
		(Error as any).captureStackTrace?.(this, asserter);
	}
}

export class MediaElementNotFoundError extends CustomError<ErrorCause> {
	constructor(cause: ErrorCause, asserter?: Function) {
		const message = `Media element not found. Cause: ${cause}`;
		super(message, cause, asserter);
	}
}

