import type { DomainTone } from "@/shared/ui/types";

export interface CatalogCardViewModel {
  key: string;
  code: string;
  title: string;
  description: string;
  subtitle: string;
  category: string;
  tags: string[];
  questionCount: number;
  durationMin: number;
  durationLabel: string;
  tone: DomainTone;
  image?: string;
  badge: string;
  statusLabel: string;
  testedLabel: string;
  iconKey: string;
  cta: string;
  disabled: boolean;
  modelCode: string;
  familyCode: string;
  theme: string;
  variantHint: string;
  catalogLayout: string;
  isFeatured: boolean;
  variants?: unknown[];
  hero?: {
    kicker?: string;
    title?: string;
    subtitle?: string;
  };
  raw: Record<string, unknown>;
}

const asRecord = (value: unknown): Record<string, unknown> => (
  value && typeof value === "object" ? value as Record<string, unknown> : {}
);

export const normalizeCatalogLabel = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  const item = asRecord(value);
  return normalizeCatalogLabel(
    item.label ?? item.name ?? item.title ?? item.value ?? item.code,
  );
};

export const normalizeCatalogTags = (value: unknown): string[] => (
  Array.isArray(value) ? value.map(normalizeCatalogLabel).filter(Boolean) : []
);

const toNumber = (value: unknown): number => {
  const result = Number(value);
  return Number.isFinite(result) && result > 0 ? result : 0;
};

export const formatCatalogDuration = (questionCount: number, durationMin = 0): string => {
  if (durationMin > 0) return `约 ${durationMin} 分钟`;
  if (questionCount > 0) return `约 ${Math.max(3, Math.ceil(questionCount / 6))} 分钟`;
  return "约 5 分钟";
};

export const mapMedicalCatalogCard = (value: unknown): CatalogCardViewModel => {
  const item = asRecord(value);
  const questionCount = toNumber(item.question_count ?? item.questionCount);
  const durationMin = toNumber(
    item.duration_min ?? item.durationMin ?? item.estimated_duration,
  );
  const code = normalizeCatalogLabel(item.code ?? item.scale_code ?? item.questionnaire_code);

  return {
    key: code || normalizeCatalogLabel(item.id),
    code,
    title: normalizeCatalogLabel(item.title ?? item.name ?? item.scale_name) || "医学量表",
    description: normalizeCatalogLabel(item.description) || "了解近期状态，辅助自我观察与沟通参考。",
    subtitle: normalizeCatalogLabel(item.subtitle),
    category: normalizeCatalogLabel(item.category),
    tags: normalizeCatalogTags(item.tags),
    questionCount,
    durationMin,
    durationLabel: formatCatalogDuration(questionCount, durationMin),
    tone: "medical",
    image: normalizeCatalogLabel(item.image) || undefined,
    badge: normalizeCatalogLabel(item.badge),
    statusLabel: normalizeCatalogLabel(item.status_label ?? item.statusLabel),
    testedLabel: normalizeCatalogLabel(item.tested_label ?? item.testedLabel),
    iconKey: normalizeCatalogLabel(item.icon_key ?? item.iconKey),
    cta: normalizeCatalogLabel(item.cta) || "开始测评",
    disabled: !code,
    modelCode: code,
    familyCode: normalizeCatalogLabel(item.family_code ?? item.familyCode),
    theme: "medical",
    variantHint: "",
    catalogLayout: normalizeCatalogLabel(item.catalog_layout ?? item.catalogLayout),
    isFeatured: Boolean(item.is_featured ?? item.isFeatured),
    variants: Array.isArray(item.variants) ? item.variants : undefined,
    raw: item,
  };
};

export const mapPersonalityCatalogCard = (value: unknown): CatalogCardViewModel => {
  const item = asRecord(value);
  const hero = asRecord(item.hero);
  const questionCount = toNumber(item.questionCount ?? item.question_count);
  const durationMin = toNumber(item.durationMin ?? item.duration_min);
  const modelCode = normalizeCatalogLabel(item.modelCode ?? item.model_code ?? item.code);
  const key = normalizeCatalogLabel(item.key ?? item.familyCode ?? item.family_code ?? modelCode).toLowerCase();

  return {
    key,
    code: modelCode,
    title: normalizeCatalogLabel(item.title ?? item.name) || "人格测评",
    description: normalizeCatalogLabel(item.description),
    subtitle: normalizeCatalogLabel(item.subtitle),
    category: normalizeCatalogLabel(item.category) || "personality",
    tags: normalizeCatalogTags(item.tags),
    questionCount,
    durationMin,
    durationLabel: formatCatalogDuration(questionCount, durationMin),
    tone: "personality",
    image: normalizeCatalogLabel(item.image) || undefined,
    badge: normalizeCatalogLabel(item.badge),
    statusLabel: normalizeCatalogLabel(item.statusLabel ?? item.status_label),
    testedLabel: normalizeCatalogLabel(item.testedLabel ?? item.tested_label),
    iconKey: normalizeCatalogLabel(item.iconKey ?? item.icon_key),
    cta: normalizeCatalogLabel(item.cta) || "开始测试",
    disabled: !modelCode,
    modelCode,
    familyCode: normalizeCatalogLabel(item.familyCode ?? item.family_code),
    theme: normalizeCatalogLabel(item.theme) || "deep",
    variantHint: normalizeCatalogLabel(item.variantHint ?? item.variant_hint),
    catalogLayout: normalizeCatalogLabel(item.catalogLayout ?? item.catalog_layout),
    isFeatured: Boolean(item.isFeatured ?? item.is_featured),
    variants: Array.isArray(item.variants) ? item.variants : undefined,
    hero: Object.keys(hero).length ? {
      kicker: normalizeCatalogLabel(hero.kicker),
      title: normalizeCatalogLabel(hero.title),
      subtitle: normalizeCatalogLabel(hero.subtitle),
    } : undefined,
    raw: item,
  };
};

export const mapAbilityCatalogCard = (value: unknown): CatalogCardViewModel => {
  const item = asRecord(value);
  const code = normalizeCatalogLabel(item.scaleCode ?? item.scale_code ?? item.code);
  const available = normalizeCatalogLabel(item.status) === "available" && Boolean(code);
  const durationLabel = normalizeCatalogLabel(item.duration) || "约 10 分钟";

  return {
    key: normalizeCatalogLabel(item.key ?? code),
    code,
    title: normalizeCatalogLabel(item.title) || "行为能力测评",
    description: normalizeCatalogLabel(item.description),
    subtitle: normalizeCatalogLabel(item.subtitle),
    category: "ability",
    tags: normalizeCatalogTags(item.filterTags ?? item.tags),
    questionCount: toNumber(item.questionCount ?? item.question_count),
    durationMin: toNumber(item.durationMin ?? item.duration_min),
    durationLabel,
    tone: "ability",
    image: normalizeCatalogLabel(item.image) || undefined,
    badge: normalizeCatalogLabel(item.badge),
    statusLabel: normalizeCatalogLabel(item.statusLabel ?? item.status_label),
    testedLabel: normalizeCatalogLabel(item.testedLabel ?? item.tested_label),
    iconKey: normalizeCatalogLabel(item.iconKey ?? item.icon_key),
    cta: normalizeCatalogLabel(item.cta) || "开始测评",
    disabled: !available,
    modelCode: code,
    familyCode: "",
    theme: "ability",
    variantHint: "",
    catalogLayout: normalizeCatalogLabel(item.catalogLayout ?? item.catalog_layout),
    isFeatured: Boolean(item.isFeatured ?? item.is_featured),
    raw: item,
  };
};

export const matchesCatalogCardSearch = (
  card: CatalogCardViewModel,
  searchText: string,
): boolean => {
  const query = String(searchText || "").trim().toLowerCase();
  if (!query) return true;
  return [card.code, card.title, card.description, card.category, ...card.tags]
    .map((part) => String(part || "").toLowerCase())
    .join(" ")
    .includes(query);
};
