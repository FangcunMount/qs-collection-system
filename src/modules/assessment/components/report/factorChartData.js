export const normalizeFactorChartData = (data = []) => {
  if (!Array.isArray(data)) return [];

  return data.map((item = {}) => {
    const score = Number(item.score) || 0;
    const rawMaxScore = item.maxScore ?? item.max_score;
    const parsedMaxScore = Number(rawMaxScore);
    const maxScore = parsedMaxScore > 0 ? parsedMaxScore : null;

    return {
      ...item,
      score,
      maxScore,
      riskLevel: item.riskLevel || item.risk_level || 'normal',
      percent: maxScore ? Math.min(Math.max((score / maxScore) * 100, 0), 100) : null,
    };
  });
};
