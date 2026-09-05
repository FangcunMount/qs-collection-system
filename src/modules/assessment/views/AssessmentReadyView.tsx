import React, { useEffect, useState } from "react";
import { Image, Picker, Text, View } from "@tarojs/components";

import PageShell from "@/shared/ui/PageShell";
import SectionHeader from "@/shared/ui/SectionHeader";
import ActionButton from "@/shared/ui/ActionButton";
import BottomActionBar from "@/shared/ui/BottomActionBar";
import SurfaceCard from "@/shared/ui/SurfaceCard";

import type { AssessmentReadyViewModel } from "../types";

export interface AssessmentReadyViewProps {
  viewModel: AssessmentReadyViewModel;
  onSelectTestee: (testeeId: string) => void;
  onAddTestee: () => void;
  onStart: () => void;
}

const AssessmentReadyView = ({
  viewModel,
  onSelectTestee,
  onAddTestee,
  onStart,
}: AssessmentReadyViewProps) => {
  const [showFullIntroduction, setShowFullIntroduction] = useState(false);
  const introductionCharacters = Array.from(viewModel.introduction);
  const hasLongIntroduction = introductionCharacters.length > 140;
  useEffect(() => setShowFullIntroduction(false), [viewModel.introduction, viewModel.title]);
  const selectedLabel = viewModel.selectedTestee?.name || "请选择档案";

  return (
    <PageShell
      tone={viewModel.tone}
      className="fill-ready-page"
      contentClassName="fill-ready-scroll"
      fixedAction={(
        <BottomActionBar className="fill-ready-footer">
          <ActionButton
            tone={viewModel.tone}
            block
            disabled={viewModel.startDisabled}
            onClick={onStart}
          >
            {viewModel.startLabel}
          </ActionButton>
        </BottomActionBar>
      )}
    >
      <SurfaceCard tone={viewModel.tone} className="questionnaire-hero-card">
        <View className="questionnaire-cover">
          <Image className="cover-image" src={viewModel.coverImage} mode="aspectFit" />
        </View>
        <View className="questionnaire-header">
          <Text className="questionnaire-title">{viewModel.title}</Text>
          {viewModel.subtitle ? (
            <Text className="questionnaire-subtitle">{viewModel.subtitle}</Text>
          ) : null}
          <View className="questionnaire-meta">
            <View className="meta-item">
              <Text className="meta-kicker">题量</Text>
              <Text className="meta-text">{viewModel.questionCount === "--" || !viewModel.questionCount ? "待确认" : `${viewModel.questionCount} 道`}</Text>
            </View>
            <View className="meta-divider" />
            <View className="meta-item">
              <Text className="meta-kicker">预计用时</Text>
              <Text className="meta-text">{viewModel.estimatedMinutes === "--" || !viewModel.estimatedMinutes ? "待确认" : `约 ${viewModel.estimatedMinutes} 分钟`}</Text>
            </View>
          </View>
        </View>
      </SurfaceCard>

      <View className="testee-selector-section">
        <SectionHeader title="为谁测评" description="请确认成员，本次结果将保存到该档案" tone={viewModel.tone} />
        {viewModel.testees.length > 0 ? (
          <SurfaceCard className="testee-selector">
            <Picker
              mode="selector"
              range={viewModel.testees}
              rangeKey="label"
              value={viewModel.selectedTesteeIndex >= 0 ? viewModel.selectedTesteeIndex : 0}
              onChange={(event) => {
                const selectedIndex = Number(event.detail.value);
                const selectedTestee = viewModel.testees[selectedIndex];
                if (selectedTestee) onSelectTestee(selectedTestee.id);
              }}
            >
              <View className="testee-picker" hoverClass="testee-picker--pressed">
                <View className="testee-picker-copy">
                  <Text className="testee-picker-caption">当前档案</Text>
                  <Text className="testee-picker-label">{selectedLabel}</Text>
                </View>
                <Text className="testee-picker-arrow">切换 ›</Text>
              </View>
            </Picker>
            {viewModel.selectedTestee ? (
              <View className="testee-info-card">
                <View className="testee-info-item">
                  <Text className="testee-info-label">姓名</Text>
                  <Text className="testee-info-value">{viewModel.selectedTestee.name}</Text>
                </View>
                <View className="testee-info-item">
                  <Text className="testee-info-label">性别</Text>
                  <Text className="testee-info-value">{viewModel.selectedTestee.gender}</Text>
                </View>
                {viewModel.selectedTestee.birthday ? (
                  <View className="testee-info-item">
                    <Text className="testee-info-label">出生日期</Text>
                    <Text className="testee-info-value">{viewModel.selectedTestee.birthday}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

          </SurfaceCard>
        ) : (
          <SurfaceCard className="testee-empty">
            <Text className="testee-empty-text">暂无可用档案</Text>
            <ActionButton variant="secondary" tone={viewModel.tone} onClick={onAddTestee}>
              添加档案
            </ActionButton>
          </SurfaceCard>
        )}
      </View>

      {viewModel.entryContext ? (
        <View className="entry-context-section">
          <SectionHeader title="当前入口来源" tone={viewModel.tone} />
          <SurfaceCard tone={viewModel.tone} className="entry-context-card">
            {viewModel.entryContext.title ? (
              <Text className="entry-context-title">{viewModel.entryContext.title}</Text>
            ) : null}
            {viewModel.entryContext.clinician ? (
              <Text className="entry-context-meta">{viewModel.entryContext.clinician}</Text>
            ) : null}
            {viewModel.entryContext.description ? (
              <Text className="entry-context-desc">{viewModel.entryContext.description}</Text>
            ) : null}
            {viewModel.entryContext.target ? (
              <Text className="entry-context-target">{viewModel.entryContext.target}</Text>
            ) : null}
            {viewModel.entryContext.statusText ? (
              <View className="entry-context-warning">
                <Text className="entry-context-warning-text">{viewModel.entryContext.statusText}</Text>
              </View>
            ) : null}
          </SurfaceCard>
        </View>
      ) : null}

      <View className="questionnaire-intro-section">
        {viewModel.writerRolesLabel ? (
          <View className="questionnaire-writer-notice">
            <Text className="meta-kicker">可填写人员</Text>
            <Text className="meta-text">{viewModel.writerRolesLabel}</Text>
          </View>
        ) : null}
        <SectionHeader title={viewModel.introTitle} tone={viewModel.tone} />
        <SurfaceCard className="questionnaire-intro-card">
          <Text className="intro-content">{hasLongIntroduction && !showFullIntroduction
            ? `${introductionCharacters.slice(0, 140).join("")}…`
            : viewModel.introduction}</Text>
          {hasLongIntroduction ? (
            <ActionButton tone={viewModel.tone} variant="ghost" onClick={() => setShowFullIntroduction((show) => !show)}>
              {showFullIntroduction ? "收起简介" : "查看完整简介"}
            </ActionButton>
          ) : null}
        </SurfaceCard>
      </View>
    </PageShell>
  );
};

export default AssessmentReadyView;
