export const PERSONALITY_MODEL_CODES = Object.freeze({
  MBTI: 'MBTI_OEJTS',
  SBTI: 'SBTI',
});

export const PERSONALITY_CATALOG_ITEMS = Object.freeze([
  {
    key: 'mbti',
    badge: '经典 16 型',
    title: '16 人格测评',
    shortTitle: '16 人格',
    headline: '测测你是 I 人还是 E 人',
    subtitle: '读懂你的认知偏好与行为模式',
    description: '从能量来源、信息感知、决策逻辑到生活方式，四个维度勾勒你的独特人格轮廓。',
    intro: '16 人格测评会从四组偏好出发，帮助你理解自己更习惯如何获取能量、观察世界、做出决定和安排生活。',
    modelCode: PERSONALITY_MODEL_CODES.MBTI,
    questionCount: 93,
    durationMin: 15,
    tags: ['职业倾向', '沟通风格', '成长建议'],
    gains: ['看见你的 16 型人格画像', '了解沟通与协作偏好', '获得更适合自己的成长建议'],
    suitableFor: ['想系统了解自己的人', '正在做职业或学习选择的人', '希望改善亲密关系和团队沟通的人'],
    disclaimer: '测评结果用于自我探索与沟通参考，不作为医学诊断依据。',
    dimensions: [
      { pair: ['E', 'I'], label: '能量' },
      { pair: ['S', 'N'], label: '感知' },
      { pair: ['T', 'F'], label: '决策' },
      { pair: ['J', 'P'], label: '生活' },
    ],
    hero: {
      kicker: '16 PERSONALITY TYPES',
      title: '测测你是 I 人还是 E 人',
      subtitle: '四组偏好，拼出更清晰的自我说明书',
      sticker: 'E/I · S/N · T/F · J/P',
    },
    theme: 'mbti',
    cta: '开始 16 人格测评',
  },
  {
    key: 'sbti',
    badge: '趣味轻量',
    title: '趣味 SBTI',
    shortTitle: 'SBTI',
    headline: '解锁你的社交小宇宙',
    subtitle: '一个适合分享的恶搞小测试',
    description: '题目更轻松、节奏更短，偏娱乐和社交分享，适合快速拿到一张好玩的 SBTI 结果卡。',
    intro: 'SBTI 是偏恶搞的趣味测评，用轻松题目生成一张适合聊天和分享的结果卡，不用于判断真实人格或心理状态。',
    modelCode: PERSONALITY_MODEL_CODES.SBTI,
    questionCount: 48,
    durationMin: 8,
    tags: ['恶搞有趣', '社交分享', '快速出结果'],
    gains: ['获得一张轻松好玩的 SBTI 标签卡', '收获适合聊天破冰的趣味描述', '得到几条不严肃但好读的小建议'],
    suitableFor: ['想玩一个轻松小测试的人', '想拿结果和朋友分享的人', '喜欢趣味表达的人'],
    disclaimer: 'SBTI 是娱乐向趣味测评，结果仅供消遣和社交分享，不代表真实人格类型或心理状态。',
    mood: ['Hi', 'Wow', 'Fun'],
    hero: {
      kicker: 'FUN PERSONALITY',
      title: '轻松测出你的 SBTI',
      subtitle: '用几分钟，生成一张适合分享的趣味标签卡',
      sticker: '恶搞 · 有趣 · 好分享',
    },
    theme: 'sbti',
    cta: '开始趣味测评',
  },
]);

export const HOME_PERSONALITY_ENTRIES = Object.freeze(
  PERSONALITY_CATALOG_ITEMS.map((item) => ({
    key: item.key,
    title: item.title,
    subtitle: item.key === 'mbti' ? '测测 I 人 E 人倾向' : '恶搞趣味小测试',
    modelCode: item.modelCode,
  }))
);

export const PERSONALITY_FLOW_STEPS = Object.freeze([
  { step: '01', title: '选择档案', desc: '为本人或家人创建受试档案' },
  { step: '02', title: '完成答题', desc: '按直觉作答，没有标准答案' },
  { step: '03', title: '获取结果', desc: '生成测评结果卡与参考说明' },
]);

export const getPersonalityModelByKey = (key) => {
  return PERSONALITY_CATALOG_ITEMS.find((item) => item.key === String(key || '').toLowerCase()) || null;
};

export const getPersonalityModelByCode = (code) => {
  return PERSONALITY_CATALOG_ITEMS.find((item) => item.modelCode === code) || null;
};
