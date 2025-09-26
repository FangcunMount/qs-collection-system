import { request } from '../servers';


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

export const getAnswersheetidBySignid = (signid) => {
  return request("/answersheet/GetAnswerSheetId", { signid }, { isNeedLoading: true })
}

export const getAnswersheetList = (testeeType, testeeId, limit) => {
  return request("/readAnswerSheet/list", {
    'testee_type': testeeType,
    'testeeid': testeeId,
    'limit': limit
  }, { isNeedLoading: true })
}

export default {
  getAnswersheet,
  getAnswersheetList,
}