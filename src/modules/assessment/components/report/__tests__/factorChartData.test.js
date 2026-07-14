import { normalizeFactorChartData } from '../factorChartData';

describe('normalizeFactorChartData', () => {
  test('accepts normalized view-model fields without losing score semantics', () => {
    expect(normalizeFactorChartData([
      { title: '注意缺陷', score: 4, maxScore: 9, riskLevel: 'medium' },
    ])).toEqual([
      expect.objectContaining({
        title: '注意缺陷',
        score: 4,
        maxScore: 9,
        riskLevel: 'medium',
        percent: 4 / 9 * 100,
      }),
    ]);
  });

  test('keeps legacy response aliases as an internal compatibility seam', () => {
    expect(normalizeFactorChartData([
      { title: '总分', score: '22', max_score: '54', risk_level: 'normal' },
    ])).toEqual([
      expect.objectContaining({
        score: 22,
        maxScore: 54,
        riskLevel: 'normal',
        percent: 22 / 54 * 100,
      }),
    ]);
  });

  test('clamps invalid input and percentages for safe chart rendering', () => {
    expect(normalizeFactorChartData(null)).toEqual([]);
    expect(normalizeFactorChartData([
      { score: -2, maxScore: 10 },
      { score: 20, maxScore: 10 },
      { score: 5, maxScore: 0 },
    ])).toEqual([
      expect.objectContaining({ score: -2, percent: 0 }),
      expect.objectContaining({ score: 20, percent: 100 }),
      expect.objectContaining({ score: 5, maxScore: null, percent: null }),
    ]);
  });
});
