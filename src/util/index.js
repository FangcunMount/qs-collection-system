import config from '../config'

export const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

export const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return `${[year, month, day].map(formatNumber).join('/')} ${[hour, minute, second].map(formatNumber).join(':')}`
}

export const getUrl = url => {
  let baseUrl = ''
  if (url.startsWith('/common')) {
    baseUrl = `https://api.${config.domain}${url.replace(new RegExp("/common"), '')}?display=json`
  } else {
    baseUrl = config.host + url + '?display=json';
  }

  if (config.dev_user) {
    baseUrl += `&dev_user=${config.dev_user}`
  }

  return baseUrl
}

/**
 * @description: 解析二维码传入的场景
 * @params scene: 加密过的码
 * @return {q, p, f} : 解析的参数
 */
export const parsingScene = scene => {
  let data = decodeURIComponent(scene).split("&");
  let result = {};
  data.map(v => {
    const [key, value] = v.split("=");
    result[key] = value;
  });
  return result;
};

export const paramsConcat = (url, params) => {
  params = Object.entries(params);
  const len = params.length
  return params.reduce((preValue, value, index) => {
    return `${preValue}${value[0]}=${value[1]}${index !== len - 1 ? '&' : ''}`
  }, `${url}?`)
}

export function oneZeroToBool(v) {
  if (v === void 0) return false
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') v = Number(v)

  return v === 1
}
export function boolToOneZero(v) {
  if (v === void 0) return '0'
  if (typeof v === 'string') return v
  if (typeof v === 'number') return String(v)

  return v ? '1' : '0'
}

export default {
  parsingScene,
  getUrl,
  formatTime,
  formatNumber,
  oneZeroToBool,
  boolToOneZero
}