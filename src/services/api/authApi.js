import {request} from '../servers';


export const getToken = (params) => {
  return request('/auth/gettoken', params);
}

export default {
  getToken
}