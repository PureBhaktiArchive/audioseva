const path = require('path');
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");

module.exports = async ({ config }) => {
  config.resolve.alias['~storybook'] = path.resolve(__dirname);
  config.resolve.alias['@'] = path.resolve(__dirname, "../src");

  config.resolve.extensions.push(
    ".ts",
    ".tsx",
    ".vue",
    ".css",
    ".less",
    ".scss",
    ".sass",
    ".html"
  );

  config.module.rules.push({
    resourceQuery: /blockType=story/,
    loader: 'vue-storybook'
  });

  config.module.rules.push({
    test: /\.tsx?$/,
    exclude: /node_modules/,
    use: [
      {
        loader: "ts-loader",
        options: {
          appendTsSuffixTo: [/\.vue$/],
          transpileOnly: true,
        },
      }
    ],
  });

  config.module.rules.push({
    test: /\.s(a|c)ss$/,
    use: ['style-loader', 'css-loader', 'sass-loader'],
    include: path.resolve(__dirname, '../'),
  });

  config.plugins.push(new ForkTsCheckerWebpackPlugin());

  return config
};
