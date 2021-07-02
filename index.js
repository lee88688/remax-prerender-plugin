const PrerenderWebpackPlugin = require('./prerenderWebpackPlugin');

module.exports = (options) => {
  return {
    configWebpack({ config }) {
      const outputPath = config.output.get('path');
      config
        .plugin('PrerenderWebpackPlugin')
        .use(PrerenderWebpackPlugin, [{...options, outputPath}])
    }
  }
}