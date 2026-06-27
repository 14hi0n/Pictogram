'use strict';
const webpack = require('webpack');
const { merge } = require('webpack-merge');

const makeCommon = require('./webpack.common.js');
const PATHS = require('./paths');

// Merge webpack configuration files
const config = (env, argv) => {
	const isDev = argv.mode !== 'production';
	return merge(makeCommon({ isDev }), {
		entry: {
			// popup: PATHS.entrypoints + '/popup/popup.ts',
			contentScript: PATHS.entrypoints + '/content/contentScript.ts',
			background: PATHS.entrypoints + '/background/background.ts',
			option: PATHS.entrypoints + '/options/index.ts',
			sidepanel: PATHS.entrypoints + '/sidepanel/sidepanel.ts'
		},
		devtool: isDev ? 'source-map' : false,
		// Give source map entries a stable webpack:// prefix so DevTools
		// shows sources under a readable "pictogram-extension" label.
		...(isDev && {
			output: {
				devtoolModuleFilenameTemplate: 'webpack://pictogram-extension/[resource-path]',
				devtoolFallbackModuleFilenameTemplate: 'webpack://pictogram-extension/[resource-path]?[id]'
			}
		}),
		plugins: [
			new webpack.DefinePlugin({
				__VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
				__VUE_OPTIONS_API__: false,
				__VUE_PROD_DEVTOOLS__: argv.mode === 'development' || argv.mode === 'production',
				__IS_DEV_MODE__: argv.mode === 'development'
			})
		]
	});
};

module.exports = config;
