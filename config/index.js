const path = require('path')

const config = {
  projectName: 'qstore',
  date: '2021-4-28',
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  plugins: [],
  defineConstants: {
  },
  copy: {
    patterns: [
    ],
    options: {
    }
  },
  alias: {
    '@': path.resolve(__dirname, '..', 'src')
  },
  framework: 'react',
  mini: {
    postcss: {
      pxtransform: {
        enable: true,
        config: {

        }
      },
      url: {
        enable: true,
        config: {
          limit: 1024 // 设定转换尺寸上限
        }
      },
      cssModules: {
        enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
        config: {
          namingPattern: 'module', // 转换模式，取值为 global/module
          generateScopedName: '[name]__[local]___[hash:base64:5]'
        }
      }
    },
    // Webpack 配置
    // 小程序使用自己的分包机制（通过 app.config.js 的 subPackages 配置）
    // 不要使用 webpack 的 splitChunks，这可能导致编译问题
    webpackChain(chain) {
      // 注意：CSS 顺序警告不影响功能，可以安全忽略
      // 如果确实需要消除警告，可以在 app.js 中统一导入样式（已实现）
      // 这里不配置 mini-css-extract-plugin，因为插件名称在不同 Taro 版本中可能不同
      // 避免因插件不存在导致编译错误
    }
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    postcss: {
      autoprefixer: {
        enable: true,
        config: {
        }
      },
      cssModules: {
        enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
        config: {
          namingPattern: 'module', // 转换模式，取值为 global/module
          generateScopedName: '[name]__[local]___[hash:base64:5]'
        }
      }
    }
  }
}

module.exports = function (merge) {
  if (process.env.NODE_ENV === 'development') {
    return merge({}, config, require('./dev'))
  }
  return merge({}, config, require('./prod'))
}
