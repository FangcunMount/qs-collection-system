module.exports = {
  env: {
    NODE_ENV: '"production"'
  },
  defineConstants: {
  },
  mini: {
    // 生产环境优化配置
    optimizeMainPackage: {
      enable: true
    }
    // 注意：不要启用 minifyXML，因为微信小程序要求 input 等标签必须有结束标签
    // minifyXML 可能会将标签压缩为自闭合形式，导致编译错误
  },
  h5: {
    /**
     * 如果h5端编译后体积过大，可以使用webpack-bundle-analyzer插件对打包体积进行分析。
     * 参考代码如下：
     * webpackChain (chain) {
     *   chain.plugin('analyzer')
     *     .use(require('webpack-bundle-analyzer').BundleAnalyzerPlugin, [])
     * }
     */
  }
}
