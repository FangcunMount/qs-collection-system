/**
 * 答卷 API
 */

import { request } from '../servers';
import config from '../../config';

/**
 * 提交答卷（新 API）
 * ⚠️ ID 精度保护：答卷 ID 已转换为字符串，避免 JavaScript 数字精度问题
 * @param {Object} data - 答卷数据
 * @param {Array} data.answers - 答案列表
 * @param {string} data.questionnaire_code - 问卷编码
 * @param {string} data.questionnaire_version - 问卷版本
 * @param {number} data.testee_id - 受试者ID
 * @param {string} data.title - 答卷标题（可选）
 * @returns {Promise<{id: string, message: string}>} ID 已转换为字符串
 */
export const submitAnswersheet = (data) => {
  return request('/answersheets', data, {
    host: config.collectionHost,
    method: 'POST',
    needToken: true
  }).then(result => {
    // ⚠️ ID 精度保护：将数字 ID 转换为字符串，避免 JavaScript 大数精度丢失
    // 后端返回的 ID 可能是数字类型，但由于 JavaScript 整数精度限制（2^53），
    // 大于此值的 ID 会丢失精度。统一转换为字符串可避免此问题。
    if (result && typeof result.id !== 'undefined') {
      return {
        ...result,
        id: String(result.id),
        // 如果返回了 assessment_id，也转换为字符串
        ...(result.assessment_id && { assessment_id: String(result.assessment_id) })
      };
    }
    return result;
  });
};

/**
 * 获取答卷详情（原始数据）
 * 在 answersheet 页面使用
 * 使用 collection.yaml 中的合法接口: GET /answersheets/{id}
 * ⚠️ ID 精度保护：所有 ID 已转换为字符串，避免 JavaScript 数字精度问题
 * @param {string|number} id - 答卷ID（自动转为字符串避免精度问题）
 */
export const getAnswersheet = (id) => {
  return new Promise((resolve, reject) => {
    request(`/answersheets/${String(id)}`, {}, {
      host: config.collectionHost,
      needToken: true,
      isNeedLoading: true
    })
      .then((result) => {
        let si = 1;
        // 适配 collection.yaml 返回的数据结构
        const processedAnswers = result.answers.map(v => {
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
        
        // ⚠️ ID 精度保护：确保所有 ID 都是字符串格式
        const processedResult = {
          ...result,
          id: String(result.id),
          testee_id: String(result.testee_id),
          // 如果有 assessment_id，也转换为字符串
          ...(result.assessment_id && { assessment_id: String(result.assessment_id) }),
          answers: processedAnswers
        };
        
        resolve(processedResult)
      }).catch((err) => {
        reject(err)
      });
  })
}

/**
 * 通过 signid 获取答卷 ID
 * 在 questionsheet 页面使用
 * ⚠️ 此接口 /answersheet/GetAnswerSheetId 不在 collection.yaml 中定义，已弃用
 * collection.yaml 中没有对应的 signid 查询接口
 * @deprecated 此接口已不再使用
 * @param {string|number} signid - 签名ID（自动转为字符串避免精度问题）
 */
export const getAnswersheetidBySignid = (signid) => {
  console.warn(
    '[answersheetApi] getAnswersheetidBySignid 使用的接口不在 collection.yaml 中定义',
    { signid }
  );
  return Promise.reject({
    code: 'UNSUPPORTED',
    message: '该接口不在 collection.yaml 中定义，不支持通过 signid 查询答卷ID'
  });
}

/**
 * 获取答卷列表
 * 在 answersheetList 页面使用
 * ⚠️ 此接口 /readAnswerSheet/list 不在 collection.yaml 中定义，已弃用
 * collection.yaml 中没有答卷列表查询的接口
 * 可以使用 getAssessments API 来获取测评列表，再从测评中获取答卷信息
 * @deprecated 此接口已不再使用
 * @param {string|number} testeeId - 受试者ID（自动转为字符串避免精度问题）
 * @param {number} limit - 限制数量
 */
export const getAnswersheetList = (testeeId, limit) => {
  console.warn(
    '[answersheetApi] getAnswersheetList 使用的接口不在 collection.yaml 中定义',
    { testeeId, limit }
  );
  return Promise.reject({
    code: 'UNSUPPORTED',
    message: '该接口不在 collection.yaml 中定义，不支持获取答卷列表'
  });
}

export default {
  submitAnswersheet,
  getAnswersheet,
  getAnswersheetidBySignid,
  getAnswersheetList,
}
