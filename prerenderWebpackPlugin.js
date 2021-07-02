const Prerender = require('./prerender');

class PrerenderWebpackPlugin {
  constructor({pages, outputPath}) {
    this.prerender = new Prerender(outputPath, pages || []);
  }

  apply(compiler) {
    compiler.hooks.afterEmit.tapAsync('PrerenderWebpackPlugin', async (compilation, callback) => {
      await this.prerender.render();
      callback()
    })
  }
}

module.exports = PrerenderWebpackPlugin;