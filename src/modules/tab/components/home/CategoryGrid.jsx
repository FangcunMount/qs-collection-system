import React from "react";
import { View, Text, Image } from "@tarojs/components";
import { AtIcon } from "taro-ui";

const CategoryGrid = ({
  categories = [],
  onCategoryClick,
  onViewAll,
}) => {
  return (
    <View className="home-section home-category-section">
      <View className="home-section__header">
        <Text className="home-section__title">按问题分类</Text>
        <View className="home-section__more" onClick={onViewAll}>
          <Text className="home-section__more-text">全部分类</Text>
          <AtIcon value="chevron-right" size="14" color="#98A2B3" />
        </View>
      </View>

      <View className="home-category-grid">
        {categories.map((category) => (
          <View
            key={category.key}
            className={`home-category-card home-category-card--${category.key}`}
            onClick={() => onCategoryClick?.(category)}
          >
            <View className="home-category-card__icon-wrap">
              <Image
                className="home-category-card__icon"
                src={category.icon}
                mode="aspectFit"
              />
            </View>
            <View className="home-category-card__content">
              <Text className="home-category-card__title">{category.title}</Text>
              <Text className="home-category-card__subtitle">
                {category.subtitle}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

export default CategoryGrid;
