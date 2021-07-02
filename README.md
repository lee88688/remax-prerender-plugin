# remax-prerender-plugin

插件借用了[taro的预渲染方案](https://taro-docs.jd.com/taro/docs/prerender/)（[源代码在这里](https://github.com/NervJS/taro/blob/c4d3174d2281f87b5e7a3bdb470036ce77bb96ea/packages/taro-mini-runner/src/prerender/prerender.ts)），只是针对Remax的微信平台做了适配，切勿在其他平台上使用。欢迎大家PR或者fork。

## 安装

`npm install @monsterlee/remax-prerender-plugin` or `yarn add @monsterlee/remax-prerender-plugin`

## 使用

```js
const prerenderPlugin = require('@monsterlee/remax-prerender-plugin');

module.exports = {
  plugins: [prerenderPlugin({
    pages: [
      'pages/index/index' // 需要预渲染的页面
    ]
  })]
};
```

## 配置

- pages，需要预渲染页面的数组

## LICENSE

[MIT](LICENSE)
