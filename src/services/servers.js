import Taro from '@tarojs/taro'

import { authorizationHandler, errorHandler } from '../util/authorization'
import { getGlobalData, setGlobalData } from '../util/globalData'
import { getUrl } from '../util'
import config from '../config'

export function request(url, params = {}, options = {}) {
  const requestParams = interceptorsRequest({
    ...options,
    url: getUrl(url),
    data: params
  })

  const token = config.token ?? getGlobalData('token') ?? ''

  if (requestParams.needToken && !token) {
    return new Promise((resolve, reject) => {
      authorizationHandler.login({appId: config.appId}).then((res) => {
        requestParams.header['token'] = res;
        setGlobalData('token', res)
        baseRequest(requestParams)
          .then((result) => {
            resolve(result)
          }).catch((err) => {
            reject(err)
          });
      }).catch((err) => {
        Taro.showToast({ title: err.errmsg, icon: 'none' })
        reject(err)
      });
    })
  }

  return baseRequest(requestParams)
}

function baseRequest(params) {
  if (params.isNeedLoading) {
    Taro.showLoading({ title: params.loadingText });
  }

  return new Promise((resolve, reject) => {
    Taro.request({
      ...params,
      complete: () => { params.isNeedLoading && Taro.hideLoading() },
      success: (res) => {
        const data = res.data;

        const authVerifySuccess = errorHandler.handleAuthError(data.errno)
        if (!authVerifySuccess) reject(data)

        if (data.errno != "0") {
          Taro.showToast({ title: data.errmsg, icon: 'none' })
          reject(data)
        }

        resolve(data.data, data)
      },
      fail: (err) => {
        Taro.showToast({ title: '请求失败', icon: 'none' })
        reject(err)
      }
    })
  })
}


function interceptorsRequest(options) {
  const defaultConfig = {
    url: '',
    data: {},
    header: {},
    method: 'GET',
    dataType: 'json',
    responseType: 'text',
    isNeedLoading: false,
    loadingText: '正在加载...',
    needToken: true
  }

  const requestParam = {
    url: options.url ?? defaultConfig.url,
    data: options.data ?? defaultConfig.data,
    header: options.header ?? defaultConfig.header,
    method: options.method ?? defaultConfig.header,
    dataType: options.dataType ?? defaultConfig.dataType,
    responseType: options.responseType ?? defaultConfig.responseType,
    isNeedLoading: options.isNeedLoading ?? defaultConfig.isNeedLoading,
    loadingText: options.loadingText ?? defaultConfig.loadingText,
    needToken: options.needToken ?? defaultConfig.needToken
  }

  requestParam.header['token'] = getGlobalData('token') || config.token || ''
  requestParam.header['Frontend-Env'] = 'wx'
  requestParam.header['Wxshop-Id'] = config.wxshopid || '' 

  return requestParam
}
