import { getGlobalData } from '../../util/globalData'
import { request } from '../servers'
import config from '../../config'

export function getForwardConfig(type = 'private', scene = 'evaluation_invitation') {
  return request('/wxforward/config', { type, scene, from: getGlobalData('from'), wxshopid: config.wxshopid })
}

export default {
  getForwardConfig,
}