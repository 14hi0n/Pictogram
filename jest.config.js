'use strict';

module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1',
	},
	testMatch: ['**/*.test.ts'],
	transform: {
		'^.+\\.tsx?$': [
			'ts-jest',
			{
				tsconfig: {
					target: 'ESNext',
					module: 'CommonJS',
					moduleResolution: 'Node',
					strict: true,
					esModuleInterop: true,
					skipLibCheck: true,
					types: ['jest'],
					paths: { '@/*': ['./src/*'] },
				},
			},
		],
	},
};
