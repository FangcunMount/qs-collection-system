import React from "react";
import { View, Text } from "@tarojs/components";
import { AtIcon } from "taro-ui";
import LoadingState from "@/shared/ui/LoadingState";

const RecentAssessmentCard = ({
  assessment,
  loading = false,
  hasTestee = false,
  onViewAll,
  onViewReport,
  onRetake,
  onExplore,
}) => {
  return (
    <View className="home-section home-recent-section">
      <View className="home-section__header">
        <Text className="home-section__title">最近测评</Text>
        <View className="home-section__more" onClick={onViewAll}>
          <Text className="home-section__more-text">查看全部</Text>
          <AtIcon value="chevron-right" size="14" color="#98A2B3" />
        </View>
      </View>

      {loading ? (
        <View className="home-loading-card home-loading-card--compact">
          <LoadingState content="加载中..." />
        </View>
      ) : assessment ? (
        <View className="home-recent-card">
          <View className="home-recent-card__icon">
            <AtIcon value="clock" size="20" color="#2F80ED" />
          </View>
          <View className="home-recent-card__main">
            <Text className="home-recent-card__title">{assessment.title}</Text>
            <Text className="home-recent-card__date">
              上次完成：{assessment.completedAt || "时间待同步"}
            </Text>
          </View>
          <View className="home-recent-card__actions">
            <View
              className="home-recent-card__button home-recent-card__button--secondary"
              onClick={() => onViewReport?.(assessment)}
            >
              <Text className="home-recent-card__button-text">查看报告</Text>
            </View>
            <View
              className="home-recent-card__button home-recent-card__button--primary"
              onClick={() => onRetake?.(assessment)}
            >
              <Text className="home-recent-card__button-text">再测一次</Text>
            </View>
          </View>
        </View>
      ) : (
        <View className="home-empty-card home-empty-card--recent">
          <Text className="home-empty-card__title">
            {hasTestee ? "暂无最近测评记录" : "选择测评对象后可查看最近记录"}
          </Text>
          <Text className="home-empty-card__desc">
            {hasTestee ? "完成一次测评后，这里会显示复测入口" : "可在切换 / 管理中维护测评对象"}
          </Text>
          {hasTestee && (
            <View className="home-empty-card__action" onClick={onExplore}>
              <Text className="home-empty-card__action-text">去发现量表</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default RecentAssessmentCard;
