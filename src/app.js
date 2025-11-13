import { Component } from 'react'

// 统一在最顶部导入所有第三方样式，避免在各个页面/组件中分散导入
import 'taro-ui/dist/style/index.scss'       // taro-ui 全局样式
import 'taro-ui-fc/dist/styles/index.less'   // taro-ui-fc 全局样式
import './app.less'                           // 项目自定义全局样式

import { checkUpdateVersion } from './util/checkEnvironment'
import { setGlobalData } from './util/globalData'
import { initConfig } from './util/authorization'
import { initUserStore } from './store/userStore'
import { initTokenStore } from './store/tokenStore'
import config from './config'

class App extends Component {
  async componentDidMount() {
    initConfig(config)
    
    // 初始化 Token Store
    initTokenStore();
    
    // 初始化用户与受试者 store
    try {
      const userResult = await initUserStore();
      console.log('[App] UserStore 初始化完成:', userResult);
    } catch (error) {
      console.error('[App] Store 初始化失败:', error);
      // 不阻断应用启动
    }
  }

  onLaunch(params) {
    console.log('[App] 小程序启动参数:', params)
    setGlobalData('shareTicket', params.shareTicket ?? '')
    checkUpdateVersion();
  }

  componentDidShow() { }

  componentDidHide() { }

  componentDidCatchError() { }

  render() {
    return this.props.children
  }
}

export default App
