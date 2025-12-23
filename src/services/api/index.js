/**
 * API 统一导出
 * 方便在项目中统一导入和使用
 */

// IAM 认证 API
export * as iamAuthn from './iamAuthnApi';

// IAM 身份管理 API
export * as iamIdentity from './iamIdentityApi';

// Collection 受试者 API
export * as testee from './testeeApi';

// Collection 测评 API
export * as assessment from './assessmentApi';

// Collection 问卷 API
export * as questionnaire from './questionnaireApi';

// Collection 量表 API
export * as scale from './scaleApi';

// 答卷 API（保持兼容）
export { default as answersheet } from './answersheetApi';

// 注册服务
export { default as registerService } from '../registerService';

/**
 * 使用示例：
 * 
 * import { iamAuthn, iamIdentity, testee, assessment } from '@/services/api';
 * 
 * // 登录
 * const token = await iamAuthn.login(code, appId);
 * 
 * // 获取用户信息
 * const user = await iamIdentity.getMe();
 * 
 * // 获取儿童列表
 * const children = await iamIdentity.getMyChildren();
 * 
 * // 获取受试者列表
 * const testees = await testee.getMyTestees();
 * 
 * // 获取测评列表
 * const assessments = await assessment.getAssessments(testeeId);
 */
