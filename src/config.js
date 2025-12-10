import Taro from '@tarojs/taro'

const is_dev = false

const configMap = {
  // 开发版Config（开发环境可以使用独立的 host）
  develop: {
    appId: 'wx72ade250b619a649',
    domain: 'yangshujie.com',
    // 开发环境：使用内网IP代替localhost，或勾选"不校验合法域名"
    // 将下面的 192.168.x.x 替换为您的实际内网IP
    iamHost: 'https://iam.yangshujie.com/api/v1',  // 请替换为实际IP
    collectionHost: 'https://collect.yangshujie.com/api/v1'
  },
  // 体验版
  trial: {
    appId: 'wx72ade250b619a649',
    domain: 'yangshujie.com',
    iamHost: 'https://iam.yangshujie.com/api/v1',
    collectionHost: 'https://collect.staging.yangshujie.com/api/v1'
  },
  // 线上版
  release: {
    appId: 'wx72ade250b619a649',
    domain: 'yangshujie.com',
    iamHost: 'https://iam.yangshujie.com/api/v1',
    collectionHost: 'https://collect.yangshujie.com/api/v1'
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