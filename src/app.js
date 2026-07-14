import { Component } from 'react'

// 统一在最顶部导入所有第三方样式，避免在各个页面/组件中分散导入
import './styles/taroify.scss'                // Taroify 已采用组件样式清单
import './app.less'                           // 项目自定义全局样式
import './styles/taroify-theme.less'          // Qlume token -> Taroify CSS variables

import { initAccountStore } from '@/shared/stores/account'
import { initSessionStore } from '@/shared/stores/session'
import { initTesteeStore } from '@/shared/stores/testees'
import { setGlobalData } from '@/shared/platform/weapp/globalData'
import { checkUpdateVersion } from '@/shared/platform/weapp/updateVersion'
import { bootstrapSession } from '@/services/auth/sessionManager'

class App extends Component {
  async componentDidMount() {
    // 初始化 Token Store（同步）
    initSessionStore();

    const bootstrapResult = await bootstrapSession({
      allowInteractiveLogin: false
    });
    if (bootstrapResult.status !== 'authenticated') {
      console.warn('[App] 会话未建立，跳过启动期 store 初始化:', bootstrapResult);
      return;
    }
    
    // 初始化用户与受试者 store（异步，并行执行）
    try {
      const [userResult, testeeResult] = await Promise.allSettled([
        initAccountStore(),
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
