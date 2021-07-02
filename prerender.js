const {JSDOM} = require('jsdom');
const wx = require('miniprogram-simulate/src/api');
const {NodeVM} = require('vm2');
const path = require('path');
const micromatch = require('micromatch');
const fs = require('fs');
const fsPromises = fs.promises;

class Prerender {
  constructor(outputPath, pages) {
    this.outputPath = outputPath;
    this.pagesConfig = pages; // 用于匹配列表
    this.runtimeOptions = {hostComponents: {}}
    this.runScriptPath = path.resolve(outputPath, 'vitualScript.js');
    this.vm = new NodeVM({
      console: 'off', // 会打印一些莫名的数据
      require: {
        external: true,
        // root: './dist',
        context: 'sandbox'
      },
      sandbox: this.buildSandbox()
    })
  }

  getRealPath(filePath, ext = '.js') {
    return path.join(this.outputPath, filePath + ext).replace(/\\/g, '\\\\');
  }

  async rewriteScript(type, path) {
    const realPath = this.getRealPath(path);
    const targetName = type === 'app' ? 'App' : 'Page';
    const reg = new RegExp(`(${targetName}\\(.*?\\);)`)
    const script = await fsPromises.readFile(realPath, 'utf-8');
    const newScript = script.replace(reg, '_inst = $1');
    const res = `var _inst;\n${newScript}\nif(PRERENDER){module.exports = _inst}`;
    await fsPromises.writeFile(realPath, res);
  }
  
  buildSandbox() {
    const Page = config => config;
    const App = Page;
    const dom = new JSDOM();
    const noop = () => {};
    return {
      ...dom,
      PRERENDER: true,
      Page,
      App,
      wx,
      getCurrentPages: noop,
      getApp: noop,
      requirePlugin: noop
    }
  }

  renderToData(config) {
    const {path} = config;
    const page = this.vm.run(`
    const page = require('${this.getRealPath(path)}');
    page.setData = () => {};
    page.onLoad();
    module.exports = page;
    `, this.runScriptPath);
    return JSON.parse(JSON.stringify(page.container.root.toJSON()));
  }

  renderToXML = (data) => {
    const {
      type,
      props,
      children,
      nodes
    } = data;
    if (type === 'plain-text') {
      return data.text;
    }
    const inner = children.map(id => nodes[id]).map(this.renderToXML).join('');
    if (type === 'root') return inner;
    const hostComponents = this.runtimeOptions.hostComponents;
    const propsAlias = (type, prop) => hostComponents[type] && hostComponents[type].alias[prop] ? hostComponents[type].alias[prop] : prop;
    const attrs = Object.keys(props).map(k => `${propsAlias(type, k)}="${props[k]}"`).join(' ');
    return `<${type} ${attrs}>${inner}</${type}>`
  }

  async writeXML(config) {
    const {path} = config;
    const data = this.renderToData({path});
    const xml = this.renderToXML(data);

    const xmlPath = this.getRealPath(path, '.wxml');
    const pageXml = await fsPromises.readFile(xmlPath);
    const index = pageXml.indexOf('<template');
    const head = pageXml.slice(0, index); // import部分
    const tail = pageXml.slice(index); // 模板部分
    fsPromises.writeFile(xmlPath, `${head}<block wx:if="{{root.nodes}}">
    ${tail}
    </block>
    <block wx:else>
    ${xml}
    </block>`);
  }
  
  async render() {
    this.runtimeOptions = require(this.getRealPath('__remax_runtime_options__'))
    const {pages: originalPages} = require(path.join(this.outputPath, 'app.json'));
    const pages = micromatch(originalPages, this.pagesConfig.map(p => typeof p === 'string' ? p : p.page));
    this.rewriteScript('app', 'app');
    // run app script

    await Promise.all(pages.map(page => this.rewriteScript('page', page)));
    for (const page of pages) {
      try {
        await this.writeXML({path: page});
      } catch(e) {
        console.log('渲染失败', page);
        console.log(e);
      }
      // await this.writeXML({path: page});
    }
  }
}

module.exports = Prerender;
