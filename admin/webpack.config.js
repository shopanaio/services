/* eslint-disable @typescript-eslint/no-var-requires */

require('dotenv').config();

const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

const TerserPlugin = require('terser-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const ReactRefreshPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const { resolveTsAliases } = require('./utils/resolveTsAliases');

const {
  ANALYZE = false,
  CMSCLIENT_ENV = 'development',
  CMSCLIENT_PORT = 3000,
  CMSCLIENT_API_URL,
  CMSCLIENT_UPLOAD_URL,
} = process.env;

// Setting NODE_ENV (production) after docker node_modules are ready
process.env.NODE_ENV = CMSCLIENT_ENV;

const isProduction = CMSCLIENT_ENV === 'production';
const isDevelopment = !isProduction;

const devServer = {
  port: CMSCLIENT_PORT,
  historyApiFallback: true,
  host: '0.0.0.0',
  hot: true,
  // proxy: [
  //   {
  //     context: ['/oauth2/callback'],
  //     target: 'http://localhost:9011',
  //     // changeOrigin: true,
  //   },
  // ],
};

const optimization = {
  minimize: true,
  minimizer: [
    new TerserPlugin({
      terserOptions: {
        keep_classnames: false,
        keep_fnames: false,
        compress: true,
      },
      // sourceMap: true,
    }),
  ],
};

console.table({
  CMSCLIENT_ENV: CMSCLIENT_ENV,
  API_URL: CMSCLIENT_API_URL,
});

module.exports = {
  mode: isProduction ? 'production' : 'development',
  entry: path.resolve(__dirname, 'src', 'index.tsx'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].bundle.js',
    publicPath: '/',
  },
  ...(isProduction ? { optimization } : {}),
  devServer,
  resolve: {
    alias: resolveTsAliases(),
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },
  performance: {
    hints: false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000,
  },
  ...(isDevelopment ? { devtool: 'source-map' } : {}),
  module: {
    rules: [
      {
        test: /\.svg$/i,
        issuer: /\.[jt]sx?$/,
        use: ['@svgr/webpack'],
      },
      {
        test: /\.(jsx|js|tsx|ts)$/,
        include: path.resolve(__dirname, 'src'),
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              plugins: isDevelopment
                ? [require.resolve('react-refresh/babel')]
                : [],
            },
          },
        ],
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.s[ac]ss$/i,
        use: [
          { loader: 'style-loader' },
          {
            loader: 'css-loader',
            options: {
              modules: true,
            },
          },
          {
            loader: 'sass-loader',
          },
        ],
      },
      {
        test: /\.(png|jpe?g|gif)$/i,
        use: [
          {
            loader: 'file-loader',
          },
        ],
      },
    ],
  },
  plugins: [
    ...(isDevelopment
      ? [new ReactRefreshPlugin(), new webpack.HotModuleReplacementPlugin()]
      : []),
    new HtmlWebpackPlugin({
      inject: 'body',
      template: path.resolve(__dirname, 'src', 'index.ejs'),
    }),
    // new LazyIconsWebpackPlugin(),
    new webpack.EnvironmentPlugin({
      NODE_ENV: CMSCLIENT_ENV || '',
      API_URL: CMSCLIENT_API_URL || '',
      UPLOAD_URL: CMSCLIENT_UPLOAD_URL || '',
    }),
    ...(ANALYZE ? [new BundleAnalyzerPlugin()] : []),
  ],
};
