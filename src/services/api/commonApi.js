import { request } from '../servers';

export function getMpEntryParams(mpqrcodeid) {
  return request('/common/mpqrcode/entrydata', { mpqrcodeid }, { needToken: false });
}


export default {
  getMpEntryParams
}