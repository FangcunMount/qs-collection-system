import { Component } from 'react'

// 统一在最顶部导入所有第三方样式，避免在各个页面/组件中分散导入
import 'taro-ui/dist/style/index.scss'       // taro-ui 全局样式
import 'taro-ui-fc/dist/styles/index.less'   // taro-ui-fc 全局样式
import './app.less'                           // 项目自定义全局样式

// 统一导入通用组件样式，确保加载顺序一致，避免 CSS 顺序冲突警告
import './components/common/SearchBox/index.less'
import './components/common/StatusTag/index.less'
import './components/common/RiskTag/index.less'
import './components/common/ScaleCard/index.less'
import './pages/common/components/EmptyState/EmptyState.less'
import './pages/common/components/LoadingState/LoadingState.less'

import { checkUpdateVersion } from './util/checkEnvironment'
import { setGlobalData } from './util/globalData'
import { initConfig } from './util/authorization'
import { initUserStore } from './store/userStore.ts'
import { initTokenStore } from './store/tokenStore'
import { initTesteeStore } from './store/testeeStore'
import config from './config'

class App extends Component {
  async componentDidMount() {
    initConfig(config)
    
    // 初始化 Token Store（同步）
    initTokenStore();
    
    // 初始化用户与受试者 store（异步，并行执行）
    try {
      const [userResult, testeeResult] = await Promise.allSettled([
        initUserStore(),
        initTesteeStore()
      ]);
      
      if (userResult.status === 'fulfilled') {
        console.log('[App] UserStore 初始化完成:', userResult.value);
      } else {
        console.error('[App] UserStore 初始化失败:', userResult.reason);
      }
      
      if (testeeResult.status === 'fulfilled') {
        console.log('[App] TesteeStore 初始化完成:', testeeResult.value);
      } else {
        console.error('[App] TesteeStore 初始化失败:', testeeResult.reason);
      }
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
