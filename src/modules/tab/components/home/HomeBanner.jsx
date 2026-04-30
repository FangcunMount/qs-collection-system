import React from "react";
import { View, Image } from "@tarojs/components";
import bannerImage from "@/assets/banner/banner_1.png";

const HomeBanner = ({ onStart }) => {
  return (
    <View className="home-banner" onClick={onStart}>
      <Image
        className="home-banner__image"
        src={bannerImage}
        mode="aspectFill"
      />
    </View>
  );
};

export default HomeBanner;
