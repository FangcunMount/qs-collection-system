import { Component } from 'react'

import './app.less'
import { checkUpdateVersion } from './util/checkEnvironment'
import { setGlobalData } from './util/globalData'
import { initConfig } from './util/authorization'
import config from './config'

class App extends Component {
  async componentDidMount() {
    initConfig(config)
  }

  onLaunch(params) {
    console.log(params)
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
