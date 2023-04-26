const path = require('path');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const TerserPlugin = require('terser-webpack-plugin');

const mode = process.argv.includes('--mode=production') ?
  'production' : 'development';

module.exports = {
  mode: mode,
  optimization: {
    runtimeChunk: 'single',
    minimize: mode === 'production',
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress:{
            drop_console: true,
          }
        }
      }),
    ],
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: Infinity,
      cacheGroups: {
        defaultVendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10,
          reuseExistingChunk: true,
          name: 'vendor'
        },
        html2canvas: {
          test: /[\\/]node_modules[\\/]html2canvas/,
          priority: -5,
          reuseExistingChunk: true,
          name: 'html2canvas',
        },
        docx: {
          test: /[\\/]node_modules[\\/]docx/,
          priority: -5,
          reuseExistingChunk: true,
          name: 'docx',
        },
        jspdf: {
          test: /[\\/]node_modules[\\/]jspdf/,
          priority: -5,
          reuseExistingChunk: true,
          name: 'jspdf',
        },
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true,
        },
      },
    }
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'h5peditor-portfolio.css'
    })
  ],
  entry: {
    'h5peditor-portfolio': './src/entries/h5peditor-portfolio.js'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      },
      {
        test: /\.(s[ac]ss|css)$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              publicPath: ''
            }
          },
          { loader: "css-loader" },
          {
            loader: "sass-loader"
          }
        ]
      },
      {
        test: /\.(svg|png|jpg|gif)$/,
        include: path.join(__dirname, 'src/assets'),
        type: 'asset/resource'
      },
      {
        test: /\.(woff|woff2|eot|ttf)$/,
        include: path.join(__dirname, 'src/fonts'),
        type: 'asset/resource'
      }
    ]
  },
  stats: {
    colors: true
  },
  devtool: (mode === 'production') ? undefined : 'eval-cheap-module-source-map'
};
