'use strict';

const path = require('path');

const PATHS = {
	src: path.resolve(__dirname, '../src'),
	entrypoints: path.resolve(__dirname, '../src/entrypoints'),
	build: path.resolve(__dirname, '../build')
};

module.exports = PATHS;
