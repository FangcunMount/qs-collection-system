/**
 * 答卷 API（旧接口）
 * 仍在部分页面使用，保留
 */

import { request } from '../servers';

/**
 * 获取答卷详情（原始数据）
 * 在 answersheet 页面使用
 */
export const getAnswersheet = (id) => {
  return new Promise((resolve, reject) => {
    request('/readAnswerSheet/original', { answersheetid: id }, { isNeedLoading: true })
      .then((result) => {
        let si = 1;
        result.answersheet.answers = result.answersheet.answers.map(v => {
          if (v.type !== "Section") {
            v.title = `${si}. ${v.title}`;
            si++;
          }

          switch (v.type) {
            case 'Radio':
              const radioOptionIndex = v.options.findIndex(o => o.is_select == '1')
              v.value = radioOptionIndex > -1 ? v.options[radioOptionIndex].code : ''
              break;
            case 'ImageRadio':
              const imageRadioOptionIndex = v.options.findIndex(o => o.is_select == '1')
              v.value = imageRadioOptionIndex > -1 ? v.options[imageRadioOptionIndex].code : ''
              break;
            case 'ScoreRadio':
              const scoreOptionIndex = v.options.findIndex(o => o.is_select == '1')
              v.value = scoreOptionIndex > -1 ? v.options[scoreOptionIndex].code : ''
              break;
            case 'CheckBox':
              v.value = v.options.filter(o => (o.is_select == '1')).map(o => (o.code))
              break;
            case 'ImageCheckBox':
              v.value = v.options.filter(o => (o.is_select == '1')).map(o => (o.code))
              break;
            case 'Select':
              const selectOptionIndex = v.options.findIndex(o => o.is_select == '1')
              v.value = selectOptionIndex > -1 ? v.options[selectOptionIndex].code : ''
              break;
            default:
              break;
          }

          return v
        })
        resolve(result)
      }).catch((err) => {
        reject(err)
      });
  })
}

/**
 * 通过 signid 获取答卷 ID
 * 在 questionsheet 页面使用
 */
export const getAnswersheetidBySignid = (signid) => {
  return request("/answersheet/GetAnswerSheetId", { signid }, { isNeedLoading: true })
}

/**
 * 获取答卷列表
 * 在 answersheetList 页面使用
 */
export const getAnswersheetList = (testeeId, limit) => {
  return request("/readAnswerSheet/list", {
    'testeeid': testeeId,
    'limit': limit
  }, { isNeedLoading: true })
}

export default {
  getAnswersheet,
  getAnswersheetidBySignid,
  getAnswersheetList,
}
