import React from "react";
import { View, Text, Image } from "@tarojs/components";
import { AtIcon } from "taro-ui";
import checklistImage from "@/assets/home/home-current-record-checklist.png";

const getTesteeDisplayName = (testee) => {
  if (!testee) return "我自己";
  return testee.legalName || testee.name || "我自己";
};

const HomeCurrentProfileCard = ({
  currentTestee,
  recentAssessment,
  recentLoading = false,
  onContinue,
}) => {
  const testeeName = getTesteeDisplayName(currentTestee);
  const hasRecent = Boolean(recentAssessment?.title);

  const label = hasRecent ? "继续了解最近状态" : "开始今天的测评";
  const title = hasRecent ? `上次完成：${recentAssessment.title}` : "选择适合今天的测评方式";
  const meta = hasRecent
    ? `完成于 ${recentAssessment.completedAt || "时间待同步"}`
    : `当前档案：${testeeName}`;
  const actionText = hasRecent ? "继续查看报告" : "开始一次测评";

  return (
    <View className="home-profile-card" onClick={onContinue}>
      <View className="home-profile-card__content">
        <Text className="home-profile-card__label">{label}</Text>
        <Text className="home-profile-card__title">{title}</Text>
        <Text className="home-profile-card__meta">
          {recentLoading ? "正在同步最近记录..." : meta}
        </Text>
        <View className="home-profile-card__actions">
          <View
            className="home-profile-card__primary"
            onClick={(event) => {
              event.stopPropagation();
              onContinue?.();
            }}
          >
            <Text>{actionText}</Text>
            <AtIcon value="chevron-right" size="15" color="#FFFFFF" />
          </View>
        </View>
      </View>
      <Image className="home-profile-card__image" src={checklistImage} mode="aspectFit" />
    </View>
  );
};

export default HomeCurrentProfileCard;
