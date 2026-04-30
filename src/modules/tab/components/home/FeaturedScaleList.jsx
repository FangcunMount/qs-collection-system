import React from "react";
import { View, Text } from "@tarojs/components";
import { AtIcon } from "taro-ui";
import LoadingState from "@/shared/ui/LoadingState";

const renderMetaText = (scale) => {
  const pieces = [];
  if (scale.questionCount) {
    pieces.push(`${scale.questionCount} 题`);
  }
  if (scale.estimatedMinutes) {
    pieces.push(`约 ${scale.estimatedMinutes} 分钟`);
  }
  return pieces.length ? pieces.join(" ｜ ") : "题量以实际问卷为准";
};

const FeaturedScaleList = ({
  scales = [],
  loading = false,
  onViewMore,
  onStartScale,
}) => {
  return (
    <View className="home-section home-featured-section">
      <View className="home-section__header">
        <Text className="home-section__title">专业精选</Text>
        <View className="home-section__more" onClick={onViewMore}>
          <Text className="home-section__more-text">更多</Text>
          <AtIcon value="chevron-right" size="14" color="#98A2B3" />
        </View>
      </View>

      {loading ? (
        <View className="home-loading-card">
          <LoadingState content="加载中..." />
        </View>
      ) : scales.length > 0 ? (
        <View className="home-scale-list">
          {scales.map((scale, index) => (
            <View
              key={scale.code || scale.id || index}
              className={`home-scale-card home-scale-card--${index % 3}`}
              onClick={() => onStartScale?.(scale)}
            >
              <View className="home-scale-card__accent" />
              <View className="home-scale-card__main">
                <Text className="home-scale-card__title">{scale.title}</Text>
                <Text className="home-scale-card__desc">
                  {scale.description}
                </Text>
                {scale.tags?.length > 0 && (
                  <View className="home-scale-card__tags">
                    {scale.tags.slice(0, 3).map((tag) => (
                      <Text key={tag} className="home-scale-card__tag">
                        {tag}
                      </Text>
                    ))}
                  </View>
                )}
                <View className="home-scale-card__footer">
                  <Text className="home-scale-card__meta">
                    {renderMetaText(scale)}
                  </Text>
                  <View className="home-scale-card__action">
                    <Text className="home-scale-card__action-text">开始测评</Text>
                    <AtIcon value="chevron-right" size="14" color="#2F80ED" />
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View className="home-empty-card">
          <Text className="home-empty-card__title">暂未获取到精选量表</Text>
          <Text className="home-empty-card__desc">可前往发现页浏览全部量表</Text>
        </View>
      )}
    </View>
  );
};

export default FeaturedScaleList;
