import medicalScaleImage from "@/assets/home/home-entry-medical-scale.png";
import personalityImage from "@/assets/home/home-entry-personality.png";
import behaviorImage from "@/assets/home/home-child-behavior.png";

export const PORTAL_ROUTE_KEYS = Object.freeze({
  SCALES: 'tabScales',
  PERSONALITY: 'personalityCatalog',
  ABILITY: 'abilityCatalog',
});

export const ASSESSMENT_PORTALS = Object.freeze([
  {
    key: 'medical',
    badge: '严谨',
    title: '医学量表',
    headline: '专业医学量表',
    subtitle: '睡眠、情绪、压力、儿童行为等\n医学与心理量表筛查',
    tone: 'medical',
    icon: 'add-circle',
    actionText: '进入',
    image: medicalScaleImage,
    labelColor: '#2F80ED',
    accentColor: '#2F80ED',
    routeKey: PORTAL_ROUTE_KEYS.SCALES,
  },
  {
    key: 'personality',
    badge: '轻松',
    title: '人格探索',
    headline: '发现人格类型',
    subtitle: '16 人格探索、I 人 E 人与\nSBTI 趣味小测试',
    tone: 'personality',
    icon: 'star',
    actionText: '探索',
    image: personalityImage,
    labelColor: '#FF8A00',
    accentColor: '#FF8A00',
    routeKey: PORTAL_ROUTE_KEYS.PERSONALITY,
  },
  {
    key: 'ability',
    badge: '成长',
    title: '行为能力',
    headline: '探索行为潜能',
    subtitle: '执行功能、感觉处理等\n行为能力观察与支持',
    tone: 'ability',
    icon: 'analytics',
    actionText: '预览',
    image: behaviorImage,
    labelColor: '#7A5AF8',
    accentColor: '#7A5AF8',
    routeKey: PORTAL_ROUTE_KEYS.ABILITY,
  },
]);
