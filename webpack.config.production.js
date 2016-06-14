/**
 * Producation Webpack Configuration file.
 *
 * Some notes:
 *  - production outputs
 */

/* global __dirname */

var webpack = require('webpack');
var path = require('path');

var ExtractTextPlugin = require("extract-text-webpack-plugin");
var autoprefixer = require('autoprefixer');

var VERSION = require('./package.json').version;

module.exports = {
  context: path.resolve(__dirname, 'client'),
  entry: {
    dashboard: './js/dashboard.js',
    index: './js/index.js',
    embed: './js/embed.js',
    course: './js/course.js',
    notebook: './js/notebook.js',
    presentation: './js/presentation.js'
  },
  output: {
    filename: '[name].bundle.js',
    chunkFilename: '[id].bundle.js',
    path: __dirname + '/public/js'
  },
  resolve: {
    extensions: ['', '.js', '.scss'],
    modulesDirectories: ['client', 'node_modules']
  },
  externals: {
    ace: true,
    'highlight.js': 'hljs',
    'markdown-it': 'markdownit',
    'katex': 'katex'
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        query: {
          presets: ['es2015', 'react'],
          plugins: ["transform-object-rest-spread"]
        }
      },
      {
        test: /\.scss$/,
        loader: ExtractTextPlugin.extract('style', 'css!postcss!sass')
      },
      {
        test: /\.json$/,
        loader: "json"
      }
    ],
    noParse: [
      /acorn\/dist\/acorn\.js$/
    ]
  },
  postcss: [ autoprefixer({ browsers: ['last 2 versions'] }) ],
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify('production')
      }
    }),
    new webpack.optimize.CommonsChunkPlugin({
      name: 'react-commons',
      chunks: ['dashboard', 'embed', 'notebook', 'presentation']
    }),
    new ExtractTextPlugin('../css/all.bundle.' + VERSION + '.css', {
      allChunks: true,
      disable: false
    }),

    new webpack.optimize.UglifyJsPlugin({
      compressor: {
        warnings: false
      },
      sourceMap: false,
      mangle: true
    })
  ],
  node: {
    Buffer: true,
    fs: 'empty' // needed for term.js
  }
};