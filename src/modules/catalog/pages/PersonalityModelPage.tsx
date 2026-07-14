import React, { useEffect, useMemo, useState } from "react";
import Taro, { useRouter } from "@tarojs/taro";
import { View, Text, Picker } from "@tarojs/components";

import { PrivacyAuthorization } from "@/shared/ui/PrivacyAuthorization";
import AppNavigationBar from "@/shared/ui/AppNavigationBar";
import BottomActionBar from "@/shared/ui/BottomActionBar";
import PageShell from "@/shared/ui/PageShell";
import ActionButton from "@/shared/ui/ActionButton";
import StatePanel from "@/shared/ui/StatePanel";
import SurfaceCard from "@/shared/ui/SurfaceCard";
import { ROUTES, routes } from "@/shared/config/routes";
import {
  findTesteeById,
  getSelectedTesteeId,
  getTesteeList,
  refreshTesteeList,
  setSelectedTesteeId,
  subscribeTesteeStore,
} from "@/shared/stores/testees";
import { listPublishedPersonalityModels } from "@/services/api/personality";
import {
  loadPersonalityModelDetail,
  resolvePublishedModelCatalogItem,
} from "@/modules/catalog/services/personalityCatalogService";
import {
  buildVariantsFromPublished,
  getDefaultVariant,
  resolveVariantByCode,
} from "@/modules/catalog/lib/mbtiVariants";
import { applyAlgorithmPresentation } from "@/modules/catalog/lib/personalityPresentation";
import "./PersonalityModelPage.less";

interface TesteeViewModel {
  id: string;
  legalName?: string;
  name?: string;
  gender?: string | number;
  birthday?: string;
}

interface PersonalityVariantViewModel {
  key: string;
  label: string;
  subtitle?: string;
  actionLabel?: string;
  questionCount?: number;
  durationMin?: number;
  modelCode: string;
  recommended?: boolean;
  description?: string;
}

interface PersonalityModelViewModel {
  key?: string;
  modelCode?: string;
  familyCode?: string;
  algorithm?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  intro?: string;
  cta?: string;
  questionCount?: number;
  durationMin?: number;
  theme?: string;
  badge?: string;
  gains?: string[];
  suitableFor?: string[];
  disclaimer?: string;
  hero?: {
    kicker?: string;
    title?: string;
    subtitle?: string;
    sticker?: string;
  };
}

interface PublishedPersonalityModel {
  familyCode?: string;
  [key: string]: unknown;
}

interface PersonalityListResult {
  items?: PublishedPersonalityModel[];
}

interface PickerChangeEvent {
  detail: {
    value: string | number;
  };
}

const listPersonalityModels = listPublishedPersonalityModels as unknown as (
  params: { page: number; pageSize: number; category?: string },
) => Promise<PersonalityListResult>;

const getErrorMessage = (error: unknown): string => (
  error instanceof Error ? error.message : "模型加载失败"
);

const formatGender = (gender?: string | number) => {
  if (gender === 1 || gender === "1") return "男";
  if (gender === 2 || gender === "2") return "女";
  return "未设置";
};

const formatTesteeName = (testee?: TesteeViewModel | null) => testee?.legalName || testee?.name || "未命名档案";

const resolvePageThemeClass = (theme?: string) => {
  const value = String(theme || "mbti").toLowerCase();
  if (["mbti", "fun", "deep", "ocean", "sbti", "default"].includes(value)) {
    return value === "sbti" ? "fun" : value;
  }
  return "mbti";
};

const resolveFooterCta = (
  model: PersonalityModelViewModel | null,
  selectedVariant: PersonalityVariantViewModel | null,
) => {
  if (!selectedVariant) {
    return model?.cta || "开始测评";
  }

  const actionLabel = String(selectedVariant.actionLabel || "").trim();
  const isMbtiFamily =
    model?.algorithm === "mbti" ||
    String(model?.familyCode || "").toLowerCase() === "mbti";

  if (actionLabel && isMbtiFamily) {
    return `开始 16 人格${actionLabel}`;
  }

  if (actionLabel) {
    return `开始 ${actionLabel}`;
  }

  if (selectedVariant.questionCount) {
    return `开始 ${selectedVariant.questionCount} 题版`;
  }

  const label = String(selectedVariant.label || "").trim();
  if (!label) return model?.cta || "开始测评";
  if (/测评|测试/.test(label)) return `开始${label}`;
  return `开始${label}测评`;
};

const PersonalityModelPage = () => {
  const router = useRouter();
  const routeModelCode = router.params?.model_code || router.params?.mc || "";
  const routeFamilyCode = router.params?.model || router.params?.family_code || "";

  const [model, setModel] = useState<PersonalityModelViewModel | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [testees, setTestees] = useState<TesteeViewModel[]>(() => getTesteeList());
  const [selectedId, setSelectedId] = useState<string | null>(() => getSelectedTesteeId());
  const [testeeLoading, setTesteeLoading] = useState(false);
  const [variants, setVariants] = useState<PersonalityVariantViewModel[]>([]);
  const [selectedVariantKey, setSelectedVariantKey] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  const activeFamilyCode = model?.familyCode || routeFamilyCode || "";
  const hasVariantFamily = variants.length > 1;

  const selectedVariant = useMemo(() => {
    if (!hasVariantFamily) return null;
    return variants.find((item) => item.key === selectedVariantKey) || getDefaultVariant(variants);
  }, [hasVariantFamily, variants, selectedVariantKey]);

  const activeQuestionCount = selectedVariant?.questionCount ?? model?.questionCount;
  const activeDurationMin = selectedVariant?.durationMin ?? model?.durationMin;
  const activeModelCode = selectedVariant?.modelCode ?? model?.modelCode ?? routeModelCode;
  const footerCta = useMemo(
    () => resolveFooterCta(model, selectedVariant),
    [model, selectedVariant]
  );

  const selectedTestee = selectedId
    ? findTesteeById(selectedId) as TesteeViewModel | null
    : null;
  const selectedIndex = Math.max(0, testees.findIndex((item) => item.id === selectedId));
  const pickerOptions = testees.map((item) => ({
    label: formatTesteeName(item),
    value: item.id,
  }));

  useEffect(() => {
    const unsubscribe = subscribeTesteeStore(({
      testeeList,
      selectedTesteeId,
    }: { testeeList: TesteeViewModel[]; selectedTesteeId: string | null }) => {
      setTestees(testeeList);
      setSelectedId(selectedTesteeId);
    });

    const loadTestees = async () => {
      try {
        setTesteeLoading(true);
        await refreshTesteeList();
      } catch (error) {
        Taro.showToast({ title: "档案加载失败", icon: "none" });
      } finally {
        setTesteeLoading(false);
      }
    };

    loadTestees();
    return unsubscribe;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadFamilyVariants = async (
      familyCode: string,
      preferredModelCode: string,
      publishedModels: PublishedPersonalityModel[] = [],
    ): Promise<PersonalityModelViewModel | null> => {
      let models = publishedModels;
      if (!models.length) {
        const result = await listPersonalityModels({
          page: 1,
          pageSize: 50,
          category: "personality",
        });
        if (cancelled) return null;
        models = result.items || [];
      }

      const isMbtiCollection = String(familyCode).toLowerCase() === "mbti";
      const familyModels = isMbtiCollection
        ? models.filter((item) => /^MBTI_/i.test(String(item.code || "")))
        : models.filter(
          (item) => String(item.familyCode || "").toLowerCase() === String(familyCode).toLowerCase()
        );
      const nextVariants = buildVariantsFromPublished(familyModels) as PersonalityVariantViewModel[];
      if (!nextVariants.length) {
        throw new Error("未找到已发布的题版");
      }

      setVariants(nextVariants);
      const matched = resolveVariantByCode(nextVariants, preferredModelCode);
      const activeVariant = matched || getDefaultVariant(nextVariants);
      setSelectedVariantKey(activeVariant.key);

      const detail =
        resolvePublishedModelCatalogItem(models, activeVariant.modelCode) ||
        (await loadPersonalityModelDetail(activeVariant.modelCode, { publishedModels: models }));
      if (cancelled) return null;

      return applyAlgorithmPresentation(
        {
          ...detail,
          key: String(familyCode).toLowerCase(),
          familyCode,
        },
        familyCode
      ) as PersonalityModelViewModel;
    };

    const loadModel = async () => {
      setPageLoading(true);
      setPageError("");

      try {
        const listResult = await listPersonalityModels({
          page: 1,
          pageSize: 50,
          category: "personality",
        });
        if (cancelled) return;

        const publishedModels = listResult.items || [];

        if (routeModelCode) {
          const detail = (
            resolvePublishedModelCatalogItem(publishedModels, routeModelCode) ||
            (await loadPersonalityModelDetail(routeModelCode, { publishedModels }))
          ) as PersonalityModelViewModel;
          if (cancelled) return;

          setVariants([]);
          setModel(detail as PersonalityModelViewModel);
          return;
        }

        if (routeFamilyCode) {
          const groupedModel = await loadFamilyVariants(routeFamilyCode, "", publishedModels);
          if (cancelled) return;
          if (!groupedModel) {
            throw new Error("未找到已发布模型");
          }
          setModel(groupedModel);
          return;
        }

        throw new Error("缺少 model_code 或 family 参数");
      } catch (error) {
        if (cancelled) return;
        console.warn("[PersonalityModelPage] 加载模型失败", error);
        setPageError(getErrorMessage(error));
        setModel(null);
        setVariants([]);
      } finally {
        if (!cancelled) {
          setPageLoading(false);
        }
      }
    };

    loadModel();
    return () => {
      cancelled = true;
    };
  }, [routeModelCode, routeFamilyCode, reloadToken]);

  const handleSelectTestee = (event: PickerChangeEvent) => {
    const next = testees[Number(event.detail.value)];
    if (!next?.id) return;
    setSelectedTesteeId(next.id);
    setSelectedId(next.id);
  };

  const handleCreateTestee = () => {
    Taro.navigateTo({
      url: routes.testeeCreate({
        submitClose: "0",
        goUrl: ROUTES.personalityModel,
        goParams: JSON.stringify({
          model: activeFamilyCode || model?.key,
          model_code: activeModelCode,
        }),
      }),
    });
  };

  const handleStart = () => {
    if (!selectedId) {
      Taro.showToast({ title: "请先选择档案", icon: "none" });
      return;
    }

    if (!activeModelCode) {
      Taro.showToast({ title: "模型信息不完整", icon: "none" });
      return;
    }

    Taro.navigateTo({
      url: routes.assessmentFill({
        kind: "personality",
        model_code: activeModelCode,
        mc: activeModelCode,
        testee_id: selectedId,
        t: selectedId,
        sp: "1",
        start: "1",
      }),
    });
  };

  const handleBack = () => {
    const pages = Taro.getCurrentPages?.() || [];
    if (pages.length > 1) {
      Taro.navigateBack();
      return;
    }
    Taro.redirectTo({ url: routes.personalityCatalog() });
  };

  const navigation = (
    <AppNavigationBar
      title="人格测评"
      showBack
      onBack={handleBack}
      tone="personality"
      transparent
    />
  );

  if (pageLoading) {
    return (
      <>
        <PageShell tone="personality" navigation={navigation}>
          <StatePanel state="loading" title="加载模型信息" tone="personality" />
        </PageShell>
        <PrivacyAuthorization />
      </>
    );
  }

  if (pageError || !model) {
    return (
      <>
        <PrivacyAuthorization />
        <PageShell tone="personality" navigation={navigation}>
          <StatePanel
            state="error"
            title="模型暂不可用"
            description={pageError || "请返回重试"}
            actionText="重新加载"
            onAction={() => setReloadToken((token) => token + 1)}
            tone="personality"
          />
        </PageShell>
      </>
    );
  }

  const gains = Array.isArray(model.gains) ? model.gains : [];
  const suitableFor = Array.isArray(model.suitableFor) ? model.suitableFor : [];
  const pageThemeClass = resolvePageThemeClass(model.theme);
  const heroTitle = model.hero?.title || model.title;
  const heroSubtitle = model.hero?.subtitle || model.subtitle || "";
  const introText = model.intro || model.description || selectedVariant?.description || "";

  return (
    <>
      <PageShell
        tone="personality"
        className={`personality-model-page personality-model-page--${pageThemeClass}`}
        contentClassName="personality-model-page__scroll"
        navigation={navigation}
        fixedAction={(
          <BottomActionBar className="personality-model-footer">
            <ActionButton
              tone="personality"
              block
              disabled={!selectedId}
              className="personality-model-footer__button"
              onClick={handleStart}
            >
              {footerCta}
            </ActionButton>
          </BottomActionBar>
        )}
      >
        <View className="personality-model-hero">
          {model.hero?.kicker || model.badge ? (
            <Text className="personality-model-hero__kicker">{model.hero?.kicker || model.badge}</Text>
          ) : null}
          <Text className="personality-model-hero__title">{heroTitle}</Text>
          {heroSubtitle ? (
            <Text className="personality-model-hero__subtitle">{heroSubtitle}</Text>
          ) : null}
          {model.hero?.sticker ? (
            <View className="personality-model-hero__sticker">
              <Text>{model.hero.sticker}</Text>
            </View>
          ) : null}
        </View>

        {hasVariantFamily ? (
          <View className="personality-model-panel">
            <Text className="personality-model-panel__title">选择题版</Text>
            <Text className="personality-model-panel__hint">可按时间与场景选择不同题量。</Text>
            <View className="personality-variant-list">
              {variants.map((variant) => {
                const isActive = variant.key === selectedVariantKey;
                return (
                  <SurfaceCard
                    key={variant.key}
                    className={`personality-variant-card ${isActive ? "is-active" : ""}`}
                    onClick={() => setSelectedVariantKey(variant.key)}
                  >
                    <View className="personality-variant-card__header">
                      <Text className="personality-variant-card__label">{variant.label}</Text>
                      {variant.recommended ? (
                        <Text className="personality-variant-card__badge">推荐</Text>
                      ) : null}
                    </View>
                    <Text className="personality-variant-card__subtitle">{variant.subtitle}</Text>
                    <View className="personality-variant-card__meta">
                      {variant.questionCount ? <Text>{variant.questionCount} 道题</Text> : null}
                      {variant.durationMin ? <Text>约 {variant.durationMin} 分钟</Text> : null}
                    </View>
                  </SurfaceCard>
                );
              })}
            </View>
          </View>
        ) : null}

        <View className="personality-model-panel">
          <Text className="personality-model-panel__title">测评介绍</Text>
          <Text className="personality-model-panel__body">{introText}</Text>
          <View className="personality-model-meta">
            {activeQuestionCount ? (
              <Text className="personality-model-meta__item">{activeQuestionCount} 道题</Text>
            ) : null}
            {activeDurationMin ? (
              <Text className="personality-model-meta__item">约 {activeDurationMin} 分钟</Text>
            ) : null}
            <Text className="personality-model-meta__item">单页单题</Text>
          </View>
        </View>

        {gains.length > 0 ? (
          <View className="personality-model-panel">
            <Text className="personality-model-panel__title">你将获得</Text>
            <View className="personality-model-list">
              {gains.map((item) => (
                <View key={item} className="personality-model-list__item">
                  <Text className="personality-model-list__mark">✓</Text>
                  <Text className="personality-model-list__text">{item}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {suitableFor.length > 0 ? (
          <View className="personality-model-panel">
            <Text className="personality-model-panel__title">适合谁测</Text>
            <View className="personality-model-tags">
              {suitableFor.map((item) => (
                <Text key={item} className="personality-model-tag">{item}</Text>
              ))}
            </View>
          </View>
        ) : null}

        <View className="personality-model-panel personality-model-testee">
          <View className="personality-model-testee__header">
            <Text className="personality-model-panel__title">选择档案</Text>
            <Text className="personality-model-testee__hint">
              {testeeLoading ? "加载中" : `${testees.length} 个档案`}
            </Text>
          </View>

          {testees.length ? (
            <>
              <Picker
                mode="selector"
                range={pickerOptions}
                rangeKey="label"
                value={selectedIndex}
                onChange={handleSelectTestee}
              >
                <View className="personality-model-picker">
                  <Text className="personality-model-picker__name">
                    {selectedTestee ? formatTesteeName(selectedTestee) : "请选择档案"}
                  </Text>
                  <Text className="personality-model-picker__arrow">切换</Text>
                </View>
              </Picker>

              {selectedTestee ? (
                <View className="personality-model-testee-card">
                  <Text className="personality-model-testee-card__name">
                    {formatTesteeName(selectedTestee)}
                  </Text>
                  <Text className="personality-model-testee-card__meta">
                    {formatGender(selectedTestee.gender)}
                    {selectedTestee.birthday ? ` · ${selectedTestee.birthday}` : ""}
                  </Text>
                </View>
              ) : null}
            </>
          ) : (
            <View className="personality-model-empty">
              <Text className="personality-model-empty__title">还没有档案</Text>
              <Text className="personality-model-empty__desc">先创建一个档案，再开始测评。</Text>
            </View>
          )}

          <View className="personality-model-create" onClick={handleCreateTestee}>
            <Text>+ 新建档案</Text>
          </View>
        </View>

        <View className="personality-model-note">
          <Text>{model.disclaimer || "请凭第一直觉作答，没有标准答案。测评结果仅用于自我探索与沟通参考。"}</Text>
        </View>

        <View className="personality-model-page__bottom-spacer" />
      </PageShell>
      <PrivacyAuthorization />
    </>
  );
};

export default PersonalityModelPage;
