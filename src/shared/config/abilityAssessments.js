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
    key: 'brief2',
    title: 'BRIEF-2 执行功能评估',
    description: '国际通用的执行功能评估工具，全面了解日常功能表现。',
    status: ABILITY_STATUS.PLANNED,
    statusLabel: '家长/教师版',
    duration: '约 10 分钟',
    testedLabel: '100w+ 人测过',
    iconKey: 'executive',
    scaleCode: null,
    filterTags: ['执行功能', 'brief'],
  },
  {
    key: 'conners4',
    title: 'Conners 4 行为评定量表',
    description: '评估儿童多动、注意力与情绪行为问题。',
    status: ABILITY_STATUS.PLANNED,
    statusLabel: '家长/教师版',
    duration: '约 15 分钟',
    testedLabel: '80w+ 人测过',
    iconKey: 'regulation',
    scaleCode: null,
    filterTags: ['儿童行为', '注意力', '行为调节'],
  },
  {
    key: 'self_regulation',
    title: '自我调节能力问卷（SRS）',
    description: '了解自我调节、情绪与行为控制的能力水平。',
    status: ABILITY_STATUS.PLANNED,
    statusLabel: '儿童自评版',
    duration: '约 8 分钟',
    testedLabel: '60w+ 人测过',
    iconKey: 'learning',
    scaleCode: null,
    filterTags: ['自我调节', '行为控制'],
  },
  {
    key: 'working_memory',
    title: '工作记忆能力评估',
    description: '评估工作记忆水平与相关认知能力。',
    status: ABILITY_STATUS.PLANNED,
    statusLabel: '学龄儿童版',
    duration: '约 12 分钟',
    testedLabel: '50w+ 人测过',
    iconKey: 'family',
    scaleCode: null,
    filterTags: ['工作记忆', '执行功能'],
  },
]);

export const isAbilityAssessmentAvailable = (item) => {
  return item?.status === ABILITY_STATUS.AVAILABLE && Boolean(item?.scaleCode);
};
