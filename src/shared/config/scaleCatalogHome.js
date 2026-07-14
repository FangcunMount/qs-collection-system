export const SCALE_COMMON_CATEGORIES = Object.freeze([
  { key: 'sleep', value: 'slp', title: '睡眠', subtitle: '质量与节律' },
  { key: 'mood', value: 'emt', title: '情绪', subtitle: '焦虑低落' },
  { key: 'pressure', value: 'pressure', title: '压力', subtitle: '负荷感受' },
  { key: 'attention', value: 'efn', title: '执行功能', subtitle: '专注拖延' },
  { key: 'adhd', value: 'adhd', title: '注意力/多动', subtitle: '儿童行为表现' },
  { key: 'tic', value: 'td', title: '抽动障碍', subtitle: '抽动症状表现' },
  { key: 'asd', value: 'asd', title: '孤独症谱系', subtitle: '社交与行为特征' },
  { key: 'sensory', value: 'sii', title: '感觉统合', subtitle: '协调处理' },
]);

export const SCALE_MEDICAL_CATEGORY_VALUES = Object.freeze(
  SCALE_COMMON_CATEGORIES.map(({ value }) => value)
);

export const isMedicalScaleCategory = (category) => (
  SCALE_MEDICAL_CATEGORY_VALUES.includes(String(category || '').trim())
);

// Keep the catalogue backward-compatible while the historical null-category
// snapshots are being backfilled. Once the backfill completes, only the
// canonical medical categories remain visible; `personality` is excluded.
export const isVisibleInMedicalScaleCatalog = (category) => {
  const normalized = String(category || '').trim();
  return normalized === '' || isMedicalScaleCategory(normalized);
};
