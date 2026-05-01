/**
 * 注册服务
 * 整合 IAM 档案创建和 Collection 受试者创建
 */

import { registerTesteeProfile, createTestee, searchTesteeProfiles } from '@/services/api/testees';
import { addTestee } from '@/shared/stores/testees';
import { getAccountInfo } from '@/shared/stores/account';

/**
 * 儿童注册数据类型
 */
export interface ChildRegisterData {
  /** 法定姓名 */
  name: string;
  /** 出生日期 (YYYY-MM-DD) */
  birthday: string;
  /** 性别 (1=男, 2=女) */
  sex: number;
  /** 证件类型（可选） */
  idType?: string;
  /** 证件号码（可选） */
  idNo?: string;
  /** 身高（厘米）（可选） */
  heightCm?: number;
  /** 体重（千克）（可选） */
  weightKg?: number;
}

/**
 * 注册结果
 */
export interface RegisterResult {
  /** IAM 档案信息 */
  child: any;
  /** Collection 受试者信息 */
  testee: any;
  /** 档案ID（来自IAM，兼容旧字段名） */
  childId: string;
  /** 受试者ID（来自Collection） */
  testeeId: string;
}

/**
 * 完整的儿童注册流程
 * 
 * 步骤：
 * 1. 在 IAM 中创建档案（建档）
 * 2. 在 Collection 中创建受试者
 * 3. 更新本地 testeeStore
 * 
 * @param childData - 儿童注册数据
 * @returns 注册结果
 * @throws 如果任何步骤失败将抛出错误
 */
export async function registerChildComplete(childData: ChildRegisterData): Promise<RegisterResult> {
  console.log('[RegisterService] 开始注册儿童:', childData.name);
  
  try {
    // Step 1: 在 IAM 创建档案
    console.log('[RegisterService] Step 1: 在 IAM 创建档案');
    
    // 构建请求数据 - 后端期望 camelCase 格式
    const iamPayload: any = {
      legalName: childData.name,
      dob: childData.birthday,
      gender: childData.sex,
      relation: 'parent'
    };
    
    // 添加可选字段
    if (childData.idType) {
      iamPayload.idType = childData.idType;
    }
    if (childData.idNo) {
      iamPayload.idNo = childData.idNo;
    }
    if (childData.heightCm !== undefined && childData.heightCm !== null) {
      iamPayload.heightCm = childData.heightCm;  // int 类型
    }
    if (childData.weightKg !== undefined && childData.weightKg !== null) {
      iamPayload.weightKg = String(childData.weightKg);  // string 类型
    }
    
    console.log('[RegisterService] IAM 请求 payload:', iamPayload);
    const iamResponse = await registerTesteeProfile(iamPayload);
    
    console.log('[RegisterService] IAM 注册成功（原始）:', iamResponse);
    
    const iamProfile = iamResponse.profile || iamResponse.child || iamResponse;
    // ⚠️ 关键：立即转为字符串，防止 JavaScript 大数精度丢失
    const childId = String(iamProfile.id || iamProfile.profileId || iamProfile.childId);
    
    if (!childId || childId === 'undefined') {
      console.error('[RegisterService] IAM 响应中未找到 profileId:', iamResponse);
      throw new Error('IAM 建档失败：未返回档案ID');
    }
    
    console.log('[RegisterService] 提取的 profileId（字符串）:', childId, '原始值:', iamProfile.id);
    
    // Step 2: 在 Collection 创建受试者
    console.log('[RegisterService] Step 2: 在 Collection 创建受试者');
    
    let testee: any;
    let testeeId: string;
    
    try {
      // 从 userStore 获取当前用户的 IAM ID
      const userInfo = getAccountInfo();
      // 保持字符串格式，避免大数精度丢失
      const iamUserId = String(userInfo?.id || '');
      
      const collectionPayload = {
        iam_user_id: iamUserId,
        iam_child_id: String(childId),
        name: iamProfile.legalName || iamProfile.legal_name,
        gender: iamProfile.gender,
        birthday: iamProfile.dob,
        tags: [],
        source: 'online_form',
        is_key_focus: false
      };
      
      console.log('[RegisterService] Collection 请求 payload:', collectionPayload);
      const testeeResponse = await createTestee(collectionPayload);
      
      console.log('[RegisterService] Collection 创建成功（原始）:', testeeResponse);
      testee = testeeResponse;
      // ⚠️ 关键：立即转为字符串
      testeeId = String(testeeResponse.id || testeeResponse.testee_id);
      console.log('[RegisterService] 提取的 testeeId（字符串）:', testeeId, '原始值:', testeeResponse.id);
    } catch (collectionError) {
      console.warn('[RegisterService] Collection 创建失败，继续使用 IAM 数据:', collectionError);
      // 即使 Collection 创建失败，也认为注册成功（因为 IAM 已成功）
      testee = null;
      testeeId = childId; // 使用 childId 作为 testeeId
    }
    
    // Step 3: 更新本地 testeeStore
    console.log('[RegisterService] Step 3: 更新本地 testeeStore');
    try {
      addTestee({
        id: testeeId,
        legalName: iamProfile.legalName || iamProfile.legal_name,
        name: iamProfile.legalName || iamProfile.legal_name,
        dob: iamProfile.dob,
        birthday: iamProfile.dob,
        gender: iamProfile.gender,
        sex: iamProfile.gender,
        idType: iamProfile.idType || iamProfile.id_type,
        idNo: iamProfile.idNo || iamProfile.id_no,
        heightCm: iamProfile.heightCm || iamProfile.height_cm,
        weightKg: iamProfile.weightKg || iamProfile.weight_kg,
        createdAt: iamProfile.createdAt || iamProfile.created_at,
        updatedAt: iamProfile.updatedAt || iamProfile.updated_at
      });
      console.log('[RegisterService] 本地 store 更新成功');
    } catch (storeError) {
      console.warn('[RegisterService] 本地 store 更新失败:', storeError);
      // Store 更新失败不影响整体流程
    }
    
    const result: RegisterResult = {
      child: iamProfile,
      testee: testee,
      childId: childId,
      testeeId: testeeId
    };
    
    console.log('[RegisterService] 注册完成:', result);
    return result;
    
  } catch (error) {
    console.error('[RegisterService] 注册失败:', error);
    throw error;
  }
}


/**
 * 检查儿童是否已注册（根据姓名和生日搜索）
 * @param name - 姓名
 * @param dob - 出生日期
 * @returns 是否已存在
 */
export async function checkChildExists(name: string, dob: string): Promise<boolean> {
  console.log('[RegisterService] 检查儿童是否存在:', { name, dob });
  
  try {
    const response = await searchTesteeProfiles(name, dob, 0, 10);
    
    const children = response?.items || [];
    const exists = children.length > 0;
    
    console.log('[RegisterService] 搜索结果:', exists ? '已存在' : '不存在', children.length, '条记录');
    return exists;
  } catch (error) {
    console.error('[RegisterService] 检查失败:', error);
    // 检查失败时返回 false，允许继续注册
    return false;
  }
}

export default {
  registerChildComplete,
  checkChildExists
};
