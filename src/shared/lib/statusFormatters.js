/**
 * 状态格式化工具函数
 */

/**
 * 获取测评状态
 * @param {object} assessment - 测评对象
 * @returns {string} 状态：normal | abnormal | pending | generating | failed
 */
export const getAssessmentStatus = (assessment) => {
  if (!assessment || !assessment.status) {
    return 'normal';
  }

  const status = assessment.status;

  if (status === 'interpreting') {
    return 'generating'; // 报告生成中
  }
  if (status === 'submitted') {
    return 'pending'; // 待解读
  }
  if (status === 'failed') {
    return 'failed'; // 失败
  }
  
  // interpreted 和 completed 都表示已完成
  if (status === 'interpreted' || status === 'completed') {
    // 根据风险等级判断
    const riskLevel = assessment.risk_level?.toLowerCase?.() || assessment.risk_level;
    if (riskLevel === 'high' || riskLevel === 'medium') {
      return 'abnormal'; // 结果异常
    }
    return 'normal'; // 结果正常
  }
  
  return 'normal';
};

/**
 * 获取风险等级配置
 */
export const getRiskConfig = (riskLevel) => {
  const raw = riskLevel?.toLowerCase?.() || riskLevel || '';
  const risk = (() => {
    if (raw === 'high' || raw === 'high_risk' || raw === 'severe' || raw === 'critical') return 'high';
    if (raw === 'medium' || raw === 'mid' || raw === 'moderate' || raw === 'medium_risk') return 'medium';
    if (raw === 'low' || raw === 'mild' || raw === 'low_risk') return 'low';
    if (raw === 'normal' || raw === 'none' || raw === 'healthy') return 'normal';
    return raw;
  })();
  
  const riskMap = {
    'high': {
      label: '高风险',
      className: 'risk-high',
      bgColor: '#EF4444',
      textColor: '#FFFFFF',
      borderColor: 'transparent',
      scoreBadgeBg: '#FFF7ED',
      scoreBadgeColor: '#F97316'
    },
    'medium': {
      label: '中风险',
      className: 'risk-medium',
      bgColor: '#F97316',
      textColor: '#FFFFFF',
      borderColor: 'transparent',
      scoreBadgeBg: '#FFF7ED',
      scoreBadgeColor: '#F97316'
    },
    'low': {
      label: '低风险',
      className: 'risk-low',
      bgColor: '#22C55E',
      textColor: '#FFFFFF',
      borderColor: 'transparent',
      scoreBadgeBg: '#F0FDF4',
      scoreBadgeColor: '#22C55E'
    },
    'normal': {
      label: '正常',
      className: 'risk-normal',
      bgColor: '#3B82F6',
      textColor: '#FFFFFF',
      borderColor: 'transparent',
      scoreBadgeBg: '#EFF6FF',
      scoreBadgeColor: '#3B82F6'
    }
  };
  
  return riskMap[risk] || riskMap['normal'];
};

/**
 * 格式化填报人
 */
export const formatReporter = (reporter) => {
  const reporterMap = {
    'parent': '家长',
    'teacher': '教师',
    'self': '自评',
    'clinical': '临床'
  };
  return reporterMap[reporter] || reporter;
};

/**
 * 格式化适用年龄
 */
export const formatApplicableAge = (age) => {
  const ageMap = {
    'infant': '婴儿',
    'preschool': '学龄前',
    'school_child': '学龄儿童',
    'adolescent': '青少年',
    'adult': '成人'
  };
  return ageMap[age] || age;
};

/**
 * 格式化阶段
 */
export const formatStageLabel = (stageValue) => {
  const stageMap = {
    'screening': '筛查',
    'deep_assessment': '深度评估',
    'follow_up': '随访',
    'outcome': '结局'
  };
  return stageMap[stageValue] || stageValue;
};
