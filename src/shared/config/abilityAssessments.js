export const ABILITY_STATUS = Object.freeze({
  AVAILABLE: 'available',
  PLANNED: 'planned',
  COMING_SOON: 'coming_soon',
});

export const ABILITY_DIRECTIONS = Object.freeze([
  {
    key: 'executive',
    title: '执行功能',
    subtitle: '计划、抑制、切换、工作记忆',
    detail: '计划、抑制、转换、工作记忆等核心能力',
    assessmentCount: 12,
    tone: 'purple',
  },
  {
    key: 'regulation',
    title: '行为调节',
    subtitle: '冲动控制、情绪调节、规则感',
    detail: '冲动控制、情绪调节、规则感与自我管理',
    assessmentCount: 10,
    tone: 'green',
  },
  {
    key: 'learning',
    title: '学习表现',
    subtitle: '任务启动、坚持度、完成质量',
    detail: '任务启动、坚持度、完成质量与学习策略',
    assessmentCount: 9,
    tone: 'yellow',
  },
  {
    key: 'family',
    title: '家庭观察',
    subtitle: '多角色填写与对照反馈',
    detail: '多角色填写与对比反馈，发现支持重点',
    assessmentCount: 8,
    tone: 'blue',
  },
]);

export const ABILITY_SPECIALIZED_ASSESSMENTS = Object.freeze([
  {
    key: 'executive_function',
    title: '执行功能评估',
    description: '从计划、抑制、转换与工作记忆等维度了解日常功能表现。',
    status: ABILITY_STATUS.PLANNED,
    statusLabel: '家长/教师版',
    duration: '约 10 分钟',
    testedLabel: '持续扩展中',
    iconKey: 'executive',
    scaleCode: null,
    filterTags: ['执行功能', '工作记忆', '计划能力'],
  },
  {
    key: 'sensory_processing',
    title: '感觉处理测评',
    description: '了解儿童对触觉、听觉、视觉与前庭刺激的处理特点。',
    status: ABILITY_STATUS.PLANNED,
    statusLabel: '家长版',
    duration: '约 8 分钟',
    testedLabel: '持续扩展中',
    iconKey: 'sensory',
    scaleCode: null,
    filterTags: ['感觉处理', '感觉统合', 'sensory'],
  },
]);

export const isAbilityAssessmentAvailable = (item) => {
  return item?.status === ABILITY_STATUS.AVAILABLE && Boolean(item?.scaleCode);
};
