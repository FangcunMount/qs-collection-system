import Taro from '@tarojs/taro';

import { routes } from '@/shared/config/routes';
import { parsingScene } from '@/shared/lib/scene';
import { getMiniProgramEntryParams } from '@/services/api/miniProgramEntries';
import { resolveAssessmentEntry } from '@/services/api/assessmentEntries';

export const INVALID_ENTRY_STATUSES = new Set(['inactive', 'disabled', 'revoked', 'expired']);

export const resolveEntryStatusText = (status) => {
  switch (status) {
    case 'inactive':
    case 'disabled':
      return '当前入口已停用';
    case 'revoked':
      return '当前入口已失效';
    case 'expired':
      return '当前入口已过期';
    default:
      return '';
  }
};

export const buildEntryErrorUrl = ({ title, text, desc, buttonText, buttonUrl }) => {
  return routes.systemError({ title, text, desc, buttonText, buttonUrl });
};

export const redirectToEntryError = (options) => {
  Taro.redirectTo({ url: buildEntryErrorUrl(options) });
};

export const hasEntryContext = (context) => {
  if (!context) return false;
  return Boolean(
    context.mpqrcodeid ||
      context.entry_title ||
      context.entry_description ||
      context.clinician_name ||
      context.target_code
  );
};

export const isAssessmentEntryToken = (value) => /^ae_[A-Za-z0-9_]+$/.test(String(value || '').trim());

const toResolvedEntryStatus = (entry) => {
  if (!entry) return '';
  if (!entry.is_active) return 'inactive';
  if (entry.expires_at && new Date(entry.expires_at).getTime() <= Date.now()) return 'expired';
  return 'active';
};

const mapResolvedAssessmentEntry = (token, result) => {
  const entry = result?.entry || {};
  const clinician = result?.clinician || {};
  const targetCode = entry.target_code || '';
  const targetType = entry.target_type || '';
  const targetVersion = entry.target_version || '';
  const clinicianName = clinician.name || '';
  const clinicianTitle = clinician.title || clinician.clinician_type || '';

  return {
    token,
    q: targetCode,
    target_code: targetCode,
    target_type: targetType,
    target_version: targetVersion,
    entry_title: clinicianName ? `${clinicianName} 推荐测评` : '扫码测评入口',
    entry_description: targetCode ? `来源入口 · ${targetCode}` : '请按入口指引完成测评。',
    entry_status: toResolvedEntryStatus(entry),
    clinician_name: clinicianName,
    clinician_title: clinicianTitle,
    raw: result,
  };
};

export const resolveAssessmentFillEntryParams = (params) => {
  return new Promise((resolve, reject) => {
    if (params.token && isAssessmentEntryToken(params.token)) {
      resolveAssessmentEntry(params.token)
        .then((result) => {
          resolve(mapResolvedAssessmentEntry(params.token, result));
        })
        .catch(reject);
      return;
    }

    if (!params.scene) {
      resolve(params);
      return;
    }

    if (!String(params.scene).includes('=') && isAssessmentEntryToken(params.scene)) {
      resolveAssessmentEntry(params.scene)
        .then((result) => {
          resolve(mapResolvedAssessmentEntry(params.scene, result));
        })
        .catch(reject);
      return;
    }

    const np = parsingScene(params.scene);
    if (!np.mpqrcodeid) {
      resolve(np);
      return;
    }

    getMiniProgramEntryParams(np.mpqrcodeid)
      .then((result) => {
        resolve({
          ...np,
          ...(result.entry_data || {}),
        });
      })
      .catch(reject);
  });
};

export const resolvePlanTaskId = (params, context) => {
  return String(
    context?.task_id ||
      context?.raw?.task_id ||
      params?.task_id ||
      ''
  );
};
