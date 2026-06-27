import React, { useEffect, useMemo, useState } from "react";
import Taro, { useRouter } from "@tarojs/taro";
import { View, Text, ScrollView, Picker } from "@tarojs/components";

import { PrivacyAuthorization } from "@/shared/ui/PrivacyAuthorization";
import { ROUTES, routes } from "@/shared/config/routes";
import {
  findTesteeById,
  getSelectedTesteeId,
  getTesteeList,
  refreshTesteeList,
  setSelectedTesteeId,
  subscribeTesteeStore,
} from "@/shared/stores/testees";
import {
  getPersonalityModelByKey,
  PERSONALITY_CATALOG_ITEMS,
} from "@/shared/config/personalityModels";
import "./PersonalityModelPage.less";

const getDefaultModel = () => PERSONALITY_CATALOG_ITEMS[0];

const formatGender = (gender) => {
  if (gender === 1 || gender === "1") return "男";
  if (gender === 2 || gender === "2") return "女";
  return "未设置";
};

const formatTesteeName = (testee) => testee?.legalName || testee?.name || "未命名档案";

const PersonalityModelPage = () => {
  const router = useRouter();
  const model = useMemo(() => {
    return getPersonalityModelByKey(router.params?.model) || getDefaultModel();
  }, [router.params?.model]);
  const [testees, setTestees] = useState(() => getTesteeList());
  const [selectedId, setSelectedId] = useState(() => getSelectedTesteeId());
  const [loading, setLoading] = useState(false);

  const selectedTestee = selectedId ? findTesteeById(selectedId) : null;
  const selectedIndex = Math.max(0, testees.findIndex((item) => item.id === selectedId));
  const pickerOptions = testees.map((item) => ({
    label: formatTesteeName(item),
    value: item.id,
  }));

  useEffect(() => {
    const unsubscribe = subscribeTesteeStore(({ testeeList, selectedTesteeId }) => {
      setTestees(testeeList);
      setSelectedId(selectedTesteeId);
    });

    const load = async () => {
      try {
        setLoading(true);
        await refreshTesteeList();
      } catch (error) {
        Taro.showToast({ title: "档案加载失败", icon: "none" });
      } finally {
        setLoading(false);
      }
    };

    load();
    return unsubscribe;
  }, []);

  const handleSelectTestee = (event) => {
    const next = testees[event.detail.value];
    if (!next?.id) return;
    setSelectedTesteeId(next.id);
    setSelectedId(next.id);
  };

  const handleCreateTestee = () => {
    Taro.navigateTo({
      url: routes.testeeCreate({
        submitClose: "0",
        goUrl: ROUTES.personalityModel,
        goParams: JSON.stringify({ model: model.key }),
      }),
    });
  };

  const handleStart = () => {
    if (!selectedId) {
      Taro.showToast({ title: "请先选择档案", icon: "none" });
      return;
    }

    Taro.navigateTo({
      url: routes.assessmentFill({
        mc: model.modelCode,
        t: selectedId,
        sp: "1",
        start: "1",
      }),
    });
  };

  return (
    <View className={`personality-model-page personality-model-page--${model.theme}`}>
      <ScrollView scrollY className="personality-model-page__scroll" enhanced showScrollbar={false}>
        <View className="personality-model-hero">
          <Text className="personality-model-hero__kicker">{model.hero.kicker}</Text>
          <Text className="personality-model-hero__title">{model.hero.title}</Text>
          <Text className="personality-model-hero__subtitle">{model.hero.subtitle}</Text>
          <View className="personality-model-hero__sticker">
            <Text>{model.hero.sticker}</Text>
          </View>
        </View>

        <View className="personality-model-panel">
          <Text className="personality-model-panel__title">测评介绍</Text>
          <Text className="personality-model-panel__body">{model.intro}</Text>
          <View className="personality-model-meta">
            <Text className="personality-model-meta__item">{model.questionCount} 道题</Text>
            <Text className="personality-model-meta__item">约 {model.durationMin} 分钟</Text>
            <Text className="personality-model-meta__item">单页单题</Text>
          </View>
        </View>

        <View className="personality-model-panel">
          <Text className="personality-model-panel__title">你将获得</Text>
          <View className="personality-model-list">
            {model.gains.map((item) => (
              <View key={item} className="personality-model-list__item">
                <Text className="personality-model-list__mark">✓</Text>
                <Text className="personality-model-list__text">{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="personality-model-panel">
          <Text className="personality-model-panel__title">适合谁测</Text>
          <View className="personality-model-tags">
            {model.suitableFor.map((item) => (
              <Text key={item} className="personality-model-tag">{item}</Text>
            ))}
          </View>
        </View>

        <View className="personality-model-panel personality-model-testee">
          <View className="personality-model-testee__header">
            <Text className="personality-model-panel__title">选择档案</Text>
            <Text className="personality-model-testee__hint">
              {loading ? "加载中" : `${testees.length} 个档案`}
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

              {selectedTestee && (
                <View className="personality-model-testee-card">
                  <Text className="personality-model-testee-card__name">
                    {formatTesteeName(selectedTestee)}
                  </Text>
                  <Text className="personality-model-testee-card__meta">
                    {formatGender(selectedTestee.gender)}
                    {selectedTestee.birthday ? ` · ${selectedTestee.birthday}` : ""}
                  </Text>
                </View>
              )}
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
      </ScrollView>

      <View className="personality-model-footer">
        <View
          className={`personality-model-footer__button ${!selectedId ? "is-disabled" : ""}`}
          onClick={handleStart}
        >
          <Text>{model.cta}</Text>
        </View>
      </View>

      <PrivacyAuthorization />
    </View>
  );
};

export default PersonalityModelPage;
