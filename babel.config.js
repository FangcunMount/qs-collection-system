// babel-preset-taro 更多选项和默认值：
// https://github.com/NervJS/taro/blob/next/packages/babel-preset-taro/README.md
module.exports = {
  presets: [
    ['taro', {
      framework: 'react',
      ts: true  // 启用 TypeScript 支持
    }]
  ],
  // 禁用紧凑模式，避免大文件（如 echarts.js）的警告
  // 这个警告不影响功能，只是 Babel 的性能优化提示
  compact: false
}
