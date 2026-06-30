/**
 * 按后端 algorithm 提供详情页展示文案（API 未返回时的 UI 回退）
 * 题量、model_code 等事实字段仍以 API 为准。
 */

const ALGORITHM_PRESENTATION = Object.freeze({
  mbti: {
    badge: '经典 16 型',
    hero: {
      kicker: '16 PERSONALITY TYPES',
      title: '测测你是 I 人还是 E 人',
      subtitle: '四组偏好，拼出更清晰的自我说明书',
      sticker: 'E/I · S/N · T/F · J/P',
    },
    intro:
      '16 人格测评会从四组偏好出发，帮助你理解自己更习惯如何获取能量、观察世界、做出决定和安排生活。',
    description:
      '从能量来源、信息感知、决策逻辑到生活方式，四个维度勾勒你的独特人格轮廓。',
    gains: [
      '看见你的 16 型人格画像',
      '了解沟通与协作偏好',
      '获得更适合自己的成长建议',
    ],
    suitableFor: [
      '想系统了解自己的人',
      '正在做职业或学习选择的人',
      '希望改善亲密关系和团队沟通的人',
    ],
    disclaimer: '测评结果用于自我探索与沟通参考，不作为医学诊断依据。',
    cta: '开始 16 人格测评',
  },
  sbti: {
    badge: '趣味轻量',
    hero: {
      kicker: 'FUN PERSONALITY',
      title: '轻松测出你的 SBTI',
      subtitle: '用几分钟，生成一张适合分享的趣味标签卡',
      sticker: '恶搞 · 有趣 · 好分享',
    },
    intro:
      'SBTI 是偏恶搞的趣味测评，用轻松题目生成一张适合聊天和分享的结果卡，不用于判断真实人格或心理状态。',
    description:
      '题目更轻松、节奏更短，偏娱乐和社交分享，适合快速拿到一张好玩的 SBTI 结果卡。',
    gains: [
      '获得一张轻松好玩的 SBTI 标签卡',
      '收获适合聊天破冰的趣味描述',
      '得到几条不严肃但好读的小建议',
    ],
    suitableFor: [
      '想玩一个轻松小测试的人',
      '想拿结果和朋友分享的人',
      '喜欢趣味表达的人',
    ],
    disclaimer: 'SBTI 是娱乐向趣味测评，结果仅供消遣和社交分享，不代表真实人格类型或心理状态。',
    cta: '开始趣味测评',
  },
  personality_typology: {
    badge: '深度探索',
    hero: {
      kicker: 'DEEP EXPLORATION',
      title: '探索你的九型人格',
      subtitle: '看见核心动机，找到更贴近自我的成长方向',
      sticker: '动机 · 冲突 · 成长',
    },
    intro:
      '九型人格从核心动机与恐惧出发，帮助你理解自己在压力、关系与成长中的典型模式。',
    description: '探索核心动机，发现内在成长方向。',
    gains: [
      '识别你的核心动机类型',
      '理解压力下的行为模式',
      '获得更有针对性的自我成长提示',
    ],
    suitableFor: [
      '想深入理解自己的人',
      '正在梳理关系模式的人',
      '关注长期成长与自我觉察的人',
    ],
    disclaimer: '测评结果用于自我探索与沟通参考，不作为医学诊断依据。',
    cta: '开始九型人格测评',
  },
  bigfive: {
    badge: '科学测评',
    hero: {
      kicker: 'SCIENTIFIC ASSESSMENT',
      title: '认识你的大五人格',
      subtitle: '从五个维度解读你的性格特质与行为倾向',
      sticker: '开放 · 尽责 · 外向 · 宜人 · 神经质',
    },
    intro:
      '大五人格从五个稳定维度描述你的性格倾向，适合用于自我了解、学习与沟通参考。',
    description: '从五个维度解读性格特质与行为倾向。',
    gains: [
      '获得五维性格特质画像',
      '了解你的优势与潜在挑战',
      '得到更清晰的自我描述语言',
    ],
    suitableFor: [
      '偏好科学心理学框架的人',
      '想系统了解性格维度的人',
      '需要沟通与协作参考的人',
    ],
    disclaimer: '测评结果用于自我探索与沟通参考，不作为医学诊断依据。',
    cta: '开始大五人格测评',
  },
});

export const resolveAlgorithmPresentation = (algorithm) => {
  const key = String(algorithm || '').toLowerCase();
  return ALGORITHM_PRESENTATION[key] || null;
};

export const estimateDurationMin = (questionCount, algorithm) => {
  const count = Number(questionCount);
  if (!Number.isFinite(count) || count <= 0) return null;

  const key = String(algorithm || '').toLowerCase();
  if (key === 'sbti') return Math.max(5, Math.round(count / 6));
  if (key === 'mbti') {
    if (count >= 60) return 15;
    if (count <= 40) return 8;
    return Math.round(count / 6);
  }
  return Math.max(5, Math.round(count / 5));
};

const pickText = (...values) => {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  return '';
};

const pickList = (primary, fallback = []) => {
  if (Array.isArray(primary) && primary.length) return primary;
  return Array.isArray(fallback) ? fallback : [];
};

/**
 * 将 algorithm 展示配置合并进目录/详情 ViewModel（API 有值时优先）
 */
export const applyAlgorithmPresentation = (item = {}, algorithm) => {
  const presentation = resolveAlgorithmPresentation(algorithm || item.algorithm);
  if (!presentation) return { ...item };

  const hero = item.hero || {};
  const presentationHero = presentation.hero || {};

  return {
    ...item,
    badge: pickText(item.badge, presentation.badge, item.category),
    intro: pickText(item.intro, item.description, presentation.intro, presentation.description),
    description: pickText(item.description, presentation.description, presentation.intro),
    gains: pickList(item.gains, presentation.gains),
    suitableFor: pickList(item.suitableFor, presentation.suitableFor),
    disclaimer: pickText(item.disclaimer, presentation.disclaimer),
    cta: pickText(item.cta, presentation.cta),
    durationMin: item.durationMin ?? estimateDurationMin(item.questionCount, algorithm || item.algorithm),
    hero: {
      kicker: pickText(hero.kicker, presentationHero.kicker),
      title: pickText(presentationHero.title, hero.title, item.title),
      subtitle: pickText(presentationHero.subtitle, hero.subtitle, item.subtitle),
      sticker: pickText(presentationHero.sticker, hero.sticker),
    },
  };
};
