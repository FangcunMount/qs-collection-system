/**
 * 注册服务
 * 由 collection-server 负责创建 IAM Profile/ProfileLink 和 QS Testee。
 */

import { createTestee } from '@/services/api/testees';
import { addTestee } from '@/shared/stores/testees';

/**
 * 档案注册数据类型
 */
export interface TesteeRegisterData {
  /** 姓名 */
  name: string;
  /** 出生日期 (YYYY-MM-DD) */
  birthday: string;
  /** 性别 (1=男, 2=女, 3=其他) */
  gender?: number;
  /** 兼容旧表单字段 */
  sex?: number;
  /** 身份证号码（可选） */
  idCardNumber?: string;
  /** 兼容旧表单字段 */
  idNo?: string;
  /** 与当前用户关系：self/parent/grandparent/other */
  relation?: string;
  /** 标签列表 */
  tags?: string[];
  /** 来源 */
  source?: string;
  /** 是否重点关注 */
  isKeyFocus?: boolean;
}

/**
 * 注册结果
 */
export interface RegisterResult {
  /** Collection 受试者信息 */
  testee: any;
  /** 受试者ID */
  testeeId: string;
  /** IAM Profile ID */
  iamProfileId?: string;
}

/**
 * 完整的档案注册流程
 *
 * 步骤：
 * 1. 调用 collection-server 创建受试者
 * 2. collection-server 通过 IAM gRPC 创建 Profile + ProfileLink
 * 3. 更新本地 testeeStore
 *
 * @param testeeData - 档案注册数据
 * @returns 注册结果
 * @throws 如果创建失败将抛出错误
 */
export async function registerTesteeComplete(testeeData: TesteeRegisterData): Promise<RegisterResult> {
  console.log('[RegisterService] 开始注册档案:', testeeData.name);
  
  try {
    const collectionPayload = {
      name: testeeData.name,
      gender: testeeData.gender ?? testeeData.sex,
      birthday: testeeData.birthday,
      id_card_number: testeeData.idCardNumber || testeeData.idNo || undefined,
      relation: testeeData.relation || 'parent',
      tags: testeeData.tags || [],
      source: testeeData.source || 'online_form',
      is_key_focus: testeeData.isKeyFocus ?? false
    };

    console.log('[RegisterService] Collection 请求 payload:', collectionPayload);
    const testeeResponse = await createTestee(collectionPayload as never) as unknown;
    const responseSource = testeeResponse && typeof testeeResponse === 'object'
      ? testeeResponse as Record<string, any>
      : {};
    const testee = responseSource.data || responseSource;
    const testeeId = String(testee?.id || testee?.testee_id || '');
    const iamProfileId = testee?.iam_profile_id ? String(testee.iam_profile_id) : undefined;

    if (!testeeId) {
      console.error('[RegisterService] Collection 响应中未找到 testeeId:', testeeResponse);
      throw new Error('创建受试者失败：未返回受试者ID');
    }

    console.log('[RegisterService] Collection 创建成功:', {
      testeeId,
      iamProfileId
    });

    try {
      addTestee({
        id: testeeId,
        legalName: testee?.name || testeeData.name,
        name: testee?.name || testeeData.name,
        dob: testee?.birthday || testeeData.birthday,
        birthday: testee?.birthday || testeeData.birthday,
        gender: testee?.gender ?? collectionPayload.gender,
        sex: testee?.gender ?? collectionPayload.gender,
        relation: testee?.relation || collectionPayload.relation,
        createdAt: testee?.created_at || testee?.createdAt,
        updatedAt: testee?.updated_at || testee?.updatedAt
      });
      console.log('[RegisterService] 本地 store 更新成功');
    } catch (storeError) {
      console.warn('[RegisterService] 本地 store 更新失败:', storeError);
    }

    return {
      testee,
      testeeId,
      iamProfileId
    };
  } catch (error) {
    console.error('[RegisterService] 注册失败:', error);
    throw error;
  }
}


export default {
  registerTesteeComplete
};
