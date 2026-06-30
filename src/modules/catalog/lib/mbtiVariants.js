import { mapPublishedModelToCatalogItem } from '@/services/api/personality/mappers';

const resolveVariantLabel = (rawModel = {}) => {
  const model = rawModel?.raw || rawModel || {};
  const title = model.title || rawModel.title || model.code || rawModel.code || '';
  const questionCount = rawModel.questionCount ?? model.question_count ?? null;
  const subtitle = model.subtitle || rawModel.subtitle || (questionCount ? `${questionCount} 道题` : '');

  return {
    label: title,
    subtitle,
  };
};

export const mapPublishedModelToVariant = (rawModel) => {
  const model = rawModel?.raw || rawModel || {};
  const code = model.code || model.model_code || rawModel.code || rawModel.modelCode || '';
  const questionCount = rawModel.questionCount ?? model.question_count ?? null;
  const labels = resolveVariantLabel(rawModel);

  return {
    key: `${code}-${questionCount || 'default'}`.toLowerCase(),
    modelCode: code,
    label: labels.label,
    subtitle: labels.subtitle,
    questionCount,
    durationMin: rawModel.durationMin ?? model.duration_min ?? null,
    description: model.description || rawModel.description || '',
    recommended: Boolean(rawModel.recommended ?? model.recommended ?? model.is_recommended),
    raw: model,
  };
};

export const buildVariantsFromPublished = (publishedModels = []) => {
  return publishedModels
    .map((item) => ({
      code: item.code || item.modelCode,
      questionCount: item.questionCount ?? item.question_count,
      durationMin: item.durationMin ?? item.duration_min,
      description: item.description,
      title: item.title,
      subtitle: item.subtitle,
      recommended: item.recommended ?? item.is_recommended,
      raw: item.raw || item,
    }))
    .filter((item) => item.code)
    .map((item) => mapPublishedModelToVariant(item))
    .sort((a, b) => (b.questionCount || 0) - (a.questionCount || 0));
};

const pickPrimaryVariant = (variants = []) => {
  if (!variants.length) return null;
  return variants.find((item) => item.recommended) || variants[0];
};

export const groupCatalogItems = (items = []) => {
  const familyBuckets = new Map();
  const standalone = [];

  items.forEach((item) => {
    const familyCode = item.familyCode;
    if (!familyCode) {
      standalone.push(item);
      return;
    }

    if (!familyBuckets.has(familyCode)) {
      familyBuckets.set(familyCode, []);
    }
    familyBuckets.get(familyCode).push(item);
  });

  const grouped = [];

  familyBuckets.forEach((familyItems, familyCode) => {
    if (familyItems.length === 1) {
      grouped.push(familyItems[0]);
      return;
    }

    const variants = buildVariantsFromPublished(familyItems.map((item) => item.raw || item));
    const primaryVariant = pickPrimaryVariant(variants);
    const primaryModel =
      familyItems.find((item) => item.modelCode === primaryVariant?.modelCode) || familyItems[0];

    grouped.push({
      ...mapPublishedModelToCatalogItem(primaryModel.raw || primaryModel),
      key: String(familyCode).toLowerCase(),
      familyCode,
      variants,
      questionCount:
        variants.map((item) => item.questionCount).filter(Boolean).join(' / ') ||
        primaryVariant?.questionCount,
      durationMin: primaryVariant?.durationMin ?? primaryModel.durationMin,
      variantCount: variants.length,
      variantHint: variants.length > 1 ? `${variants.length} 种题版可选` : '',
    });
  });

  const merged = [...grouped, ...standalone];
  return merged.sort((left, right) => {
    const leftOrder = left.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.sortOrder ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return String(left.title || '').localeCompare(String(right.title || ''), 'zh-CN');
  });
};

export const resolveVariantByCode = (variants, modelCode) => {
  if (!modelCode) return null;
  return variants.find((item) => item.modelCode === modelCode) || null;
};

export const getDefaultVariant = (variants = []) => pickPrimaryVariant(variants);

// 兼容旧命名
export const buildMbtiVariantsFromPublished = buildVariantsFromPublished;
export const resolveMbtiVariantByCode = resolveVariantByCode;
export const getDefaultMbtiVariant = getDefaultVariant;
