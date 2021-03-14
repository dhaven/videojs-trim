const path = require('path');
const webpack = require('webpack');

module.exports = (env) => {
  return {
    entry: './main.js',
    output: {
        path: path.resolve(__dirname),
        filename: 'app.bundle.js'
    },
    module: {
      rules: [
        {
          test: /\.js?$/,
          exclude: /node_modules/,
          include: [
            path.resolve(__dirname, 'videojs')
          ],
          use: {
            loader: "babel-loader",
            options: {
              presets: ['@babel/preset-env']
            }
          }
        }
      ]
    }
  }
}
