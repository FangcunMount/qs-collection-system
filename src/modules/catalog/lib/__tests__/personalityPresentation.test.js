import { mapPublishedModelToCatalogItem, normalizePersonalityModel } from '@/services/api/personality/mappers';
import { applyAlgorithmPresentation } from '../personalityPresentation';
import { groupCatalogItems } from '../mbtiVariants';

test.each([
  ['MBTI_FORM_A', 'mbti', '16 型人格画像', '九型人格'],
  ['BIG5_50', 'ocean', '五维性格特质画像', '九型人格'],
  ['SBTI_FUN', 'fun', 'SBTI 标签卡', '九型人格'],
  ['ENNEAGRAM_45', 'deep', '核心动机类型', '16 型人格画像'],
])('shared typology algorithm uses the matching model presentation for %s', (code, theme, expected, absent) => {
  const raw = { code, title: '模型原始标题', algorithm: 'personality_typology', kind: 'typology', question_count: 45 };
  const item = mapPublishedModelToCatalogItem(raw);
  expect(item.theme).toBe(theme);
  expect(item.gains.join(' ')).toContain(expected);
  expect(JSON.stringify(item)).not.toContain(absent);
  expect(item.algorithm).toBe('personality_typology');
  expect(item.modelCode).toBe(code);
  expect(item.questionCount).toBe(45);
  // Both detail-service remapping and family-page decoration must be stable.
  expect(mapPublishedModelToCatalogItem(normalizePersonalityModel(raw).raw)).toEqual(item);
  expect(applyAlgorithmPresentation(item, item.familyCode)).toEqual(item);
});

test('unknown shared algorithms do not acquire enneagram claims or group unrelated models', () => {
  const items = ['CUSTOM_A', 'CUSTOM_B'].map(code => mapPublishedModelToCatalogItem({ code, algorithm: 'personality_typology' }));
  expect(items[0].gains).toEqual([]);
  expect(items[0].intro).toBe('');
  expect(items[0].cardBadge).toBe('');
  expect(groupCatalogItems(items)).toHaveLength(2);
});

test('published presentation text wins over frontend defaults', () => {
  const item = mapPublishedModelToCatalogItem({ code: 'MBTI_FORM_A', algorithm: 'personality_typology',
    description: '发布的介绍原文', gains: ['发布的内容'], hero: { title: '发布的主标题', subtitle: '发布的副标题', sticker: '发布的标签' } });
  const decorated = applyAlgorithmPresentation(item, 'mbti');
  expect(decorated.intro).toBe('发布的介绍原文');
  expect(decorated.gains).toEqual(['发布的内容']);
  expect(decorated.hero).toMatchObject({ title: '发布的主标题', subtitle: '发布的副标题', sticker: '发布的标签' });
});
