import Taro from '@tarojs/taro'

const is_dev = false

const configMap = {
  // 开发版Config
  develop: {
    wxshopid: 50,
    domain: 'fangcunhulian.cn',
    dev_user: 'yangshujie',
    token: 'fcqx5c72ad4aeb59e4fcea2f6d93d276953b'
    // token: 'fcqx4182e59c981dece8a08a06e64ec40855'
    // token: 'fcqxb756cd1162f06b9c458facd6c2b50550'
    // token: 'fcqx01fa5c6cdf7913a0b7350e2039925c0a'
    // token: 'fcqxff5ef7be5c775f0306470d57a1d66158'
  },
  // 体验版
  trial: {
    wxshopid: 50,
    domain: 'fangcunhulian.cn',
  },
  // 线上版
  release: {
    wxshopid: 50,
    domain: 'fangcunyisheng.com',
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
  host: 'https://mpwenjuan.' + config.domain,
  // host: 'https://mockapi.eolinker.com/VSRnDuC52a14e4cc405c00d4d526bb3baaf1fd4c32e9f74',
  envVersion,
}