import Taro from '@tarojs/taro'

const is_dev = false

const configMap = {
  // 开发版Config
  develop: {
    wxshopid: 50,
    domain: 'yangshujie.com',
    dev_user: 'yangshujie',
    token: 'fcqx5c72ad4aeb59e4fcea2f6d93d276953b'
  },
  // 体验版
  trial: {
    wxshopid: 50,
    domain: 'yangshujie.com',
  },
  // 线上版
  release: {
    wxshopid: 50,
    domain: 'yangshujie.com',
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
  host: 'https://qs-collection-system.' + config.domain,
  // host: 'https://mockapi.eolinker.com/VSRnDuC52a14e4cc405c00d4d526bb3baaf1fd4c32e9f74',
  envVersion,
}