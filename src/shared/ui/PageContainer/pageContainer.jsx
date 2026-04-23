import React from "react";
import { View, ScrollView } from "@tarojs/components";
import "./index.less";

const PageContainer = props => {
  return (
    <View className='qs-page s-bg-secondary s-text-primary'>
      <View style={{ flexGrow: 1 }}>{props.header}</View>
      <ScrollView
        id='page-container'
        scroll-y
        scroll-top={props.scrollTop}
        scroll-with-animation
        className='qs-page-container s-bg-primary'
      >
        {props.children}
      </ScrollView>
    </View>
  );
};

export default PageContainer;
