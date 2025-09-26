import { request } from '../servers';

export function getMpEntryParams(mpqrcodeid) {
  return request('/common/mpqrcode/entrydata', { mpqrcodeid }, { needToken: false });
}

export function postReachstore(clinicid) {
  return request('/common/converjourney/reachstore', { clinicid }, { method: 'POST' });
}


export default {
  getMpEntryParams,
  postReachstore
}