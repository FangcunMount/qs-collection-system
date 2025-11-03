import Taro from '@tarojs/taro'

const is_dev = false

const configMap = {
  // 开发版Config（开发环境可以使用独立的 host）
  develop: {
    appId: 'wx72ade250b619a649',
    domain: 'yangshujie.com',
    // 开发环境自定义域名示例（可按需改为 http://localhost:3000 或内网域名）
    iamHost: 'https://iam.yangshujie.com/api/v1',
    collectionHost: 'https://collection.dev.yangshujie.com/api/v1'
  },
  // 体验版
  trial: {
    appId: 'wx72ade250b619a649',
    domain: 'yangshujie.com',
    iamHost: 'https://iam.yangshujie.com/api/v1',
    collectionHost: 'https://collection.staging.yangshujie.com/api/v1'
  },
  // 线上版
  release: {
    appId: 'wx72ade250b619a649',
    domain: 'yangshujie.com',
    iamHost: 'https://iam.yangshujie.com/api/v1',
    collectionHost: 'https://collection.yangshujie.com/api/v1'
  }
};

let { miniProgram: { envVersion } } = Taro.getAccountInfoSync();

if (!envVersion) {
  if (is_dev) {
    envVersion = 'develop'
  } else {
    envVersion = 'release'
  }
}

const config = configMap[envVersion];

export default {
  ...config,
  // 优先使用环境中显式配置的 iamHost / collectionHost
  iamHost: config.iamHost || ('https://iam.' + config.domain + '/api/v1'),
  collectionHost: config.collectionHost || ('https://collection.' + config.domain + '/api/v1'),
  // 兼容旧代码的 host 字段，优先使用 collectionHost
  host: config.host || (config.collectionHost || ('https://collection.' + config.domain)),
  // host: 'https://mockapi.eolinker.com/VSRnDuC52a14e4cc405c00d4d526bb3baaf1fd4c32e9f74',
  envVersion,
}