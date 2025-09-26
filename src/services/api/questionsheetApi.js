import { boolToOneZero } from '../../util';
import { getGlobalData } from '../../util/globalData';
import { request } from '../servers';


export const getQuestionsheet = (code) => {
  return new Promise((resolve, reject) => {
    request('/questionsheet/one', { code })
      .then((result) => {
        let currentQuestionIndex = 1;
        result.questionsheet.questions = result.questionsheet.questions.map((v, i) => {
          // section 题型需要跳过（无需题号）
          if (v.type === "Section") {
            return v;
          }

          v.title = `${currentQuestionIndex}. ${v.title}`;
          currentQuestionIndex++;

          switch (v.type) {
            case 'CheckBox':
              v.value = []
              break;
            default:
              v.value = ''
              break;
          }
          return v;
        });

        resolve(result)
      }).catch((err) => {
        reject(err)
      });
  })
}

export const postQuestionsheet = (questionsheet, writer_role_code, signid) => {
  const submitData = {}
  submitData['answersheet'] = {
    ...questionsheet,
    answers: questionsheet.answers.map(v => {
      v.question_code = v.code;

      if (v.type !== "Section") {
        v.title = v.title.slice(3);
      }

      switch (v.type) {
        case 'Radio':
          v.options = v.options.map(o => ({ ...o, is_select: boolToOneZero(o.code == v.value) }))
          break;
        case 'ScoreRadio':
          v.options = v.options.map(o => ({ ...o, is_select: boolToOneZero(o.code == v.value) }))
          break;
        case 'ImageRadio':
          v.options = v.options.map(o => ({ ...o, is_select: boolToOneZero(o.code == v.value) }))
          break;
        case 'CheckBox':
          v.options = v.options.map(o => ({ ...o, is_select: boolToOneZero(v.value.includes(o.code)) }))
          break;
        case 'ImageCheckBox':
          v.options = v.options.map(o => ({ ...o, is_select: boolToOneZero(v.value.includes(o.code)) }))
          break;
        case 'Select':
          v.options = v.options.map(o => ({ ...o, is_select: boolToOneZero(o.code == v.value) }))
          break;
        default:
          break;
      }

      return v
    })
  }

  if (writer_role_code) {
    submitData['writer_role_code'] = writer_role_code
  }

  if (signid) {
    submitData['signid'] = signid
  }

  const fromCode = getGlobalData('from')
  submitData['from'] = fromCode

  if (getGlobalData('testeeid')) {
    submitData['testeeid'] = getGlobalData('testeeid')
  }
  
  if (getGlobalData('fcActivityId')) {
    submitData['activity'] = getGlobalData('fcActivityId')
  }

  if (getGlobalData('senderid')) {
    submitData['senderid'] = getGlobalData('senderid')
  }

  return request('/writeAnswerSheet/submit', submitData, { method: 'POST' })
}

export default {
  getQuestionsheet,
  postQuestionsheet
}