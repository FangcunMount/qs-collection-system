import { request } from '../servers';


export const postAddUsertrack = (through_type, throughid, behavior_type, behavior_result_objid) => {
  return request('/usertrack/add', { through_type, throughid, behavior_type, behavior_result_objid }, { method: 'POST' });
}

export default {
  postAddUsertrack
}