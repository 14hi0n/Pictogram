'use strict';

const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { VueLoaderPlugin } = require('vue-loader');

const PATHS = require('./paths');

// used in the module rules and in the stats exclude list
const IMAGE_TYPES = /\.(png|jpe?g|gif|svg|mp4)$/i;

// To re-use webpack configuration across templates,
// CLI maintains a common webpack configuration file - `webpack.common.js`.
// Whenever user creates an extension, CLI adds `webpack.common.js` file
// in template's `config` folder
module.exports = function buildCommon({ isDev }) {
	return {
		devServer: {
			static: {
				directory: PATHS.build
			},
			port: 8080
		},
		output: {
			// the build folder to output bundles and assets in.
			path: PATHS.build,
			// the filename template for entry chunks
			filename: '[name].js',
			// remove stale files from previous builds before emitting
			clean: true
		},
		stats: {
			all: false,
			errors: true,
			builtAt: true,
			assets: true,
			excludeAssets: [IMAGE_TYPES]
		},
		experiments: {
			// outputModule: true
		},
		module: {
			rules: [
				{
					test: /\.tsx?$/,
					loader: 'ts-loader',
					options: { appendTsSuffixTo: [/\.vue$/] },
					exclude: /node_modules/
				},
				{
					test: /\.vue$/,
					loader: 'vue-loader'
				},
				// Help webpack in understanding CSS files imported in .js files
				{
					test: /\.(scss|css)$/,
					use: [
						MiniCssExtractPlugin.loader,
						// url: false — шрифты и статика обрабатываются CopyWebpackPlugin, не webpack'ом
						{ loader: 'css-loader', options: { url: false } },
						{
							loader: 'sass-loader'
						}
					]
				},
				// Check for images imported in .js files and
				{
					test: IMAGE_TYPES,
					use: [
						{
							loader: 'file-loader',
							options: {
								outputPath: 'assets',
								name: '[name].[ext]'
							}
						}
					]
				}
			]
		},
		resolve: {
			extensions: ['.ts', '.tsx', '.js', '.vue'],
			alias: {
				'@': PATHS.src
				//   vue$: 'vue/dist/vue.runtime.esm-bundler.js'
			}
		},
		plugins: [
			new VueLoaderPlugin(),
			// Copy static assets from `public` folder to `build` folder.
			// manifest.json is handled separately so we can inject dev-only fields.
			new CopyWebpackPlugin({
				patterns: [
					{
						from: 'manifest.json',
						context: 'public',
						transform(content) {
							const manifest = JSON.parse(content.toString());
							// In development, add contentScript.js.map to web_accessible_resources
							// as a precaution — map files are dev-only and must not ship in production.
							if (isDev) {
								for (const entry of manifest.web_accessible_resources || []) {
									if (!entry.resources.includes('contentScript.js.map')) {
										entry.resources.push('contentScript.js.map');
									}
								}
							}
							return JSON.stringify(manifest, null, 4);
						}
					},
					{
						from: '**/*',
						context: 'public',
						globOptions: {
							ignore: ['**/manifest.json']
						}
					}
				]
			}),
			// Extract CSS into separate files
			new MiniCssExtractPlugin({
				filename: '[name].css'
			})
		]
	};
};
