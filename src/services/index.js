/**
 * 服务层统一导出（保留用于向后兼容）
 * 
 * 新代码推荐直接从各 API 模块导入：
 * - 认证: import { login, refreshToken } from '@/services/api/iamAuthnApi'
 * - 身份: import { getMe, getMyChildren } from '@/services/api/iamIdentityApi'
 * - 受试者: import { getMyTestees } from '@/services/api/testeeApi'
 * - 测评: import { getAssessments } from '@/services/api/assessmentApi'
 * - 问卷: import { getQuestionnaires } from '@/services/api/questionnaireApi'
 */

import questionnaireSubmissionApi from "./api/questionnaireSubmissionApi";
import answersheetApi from "./api/answersheetApi";
import analysisApi from "./api/analysisApi";
import questionnaireApi from "./api/questionnaireApi";

export default {
  ...questionnaireSubmissionApi,
  ...answersheetApi,
  ...analysisApi,
  ...questionnaireApi
};
