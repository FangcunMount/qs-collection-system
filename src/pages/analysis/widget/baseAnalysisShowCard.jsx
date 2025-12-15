import React from 'react'
import { View, Text } from '@tarojs/components'
import './baseAnalysisShowCard.less'

const BaseAnalysisShowCard = ({ title, content, children }) => {
  return (
    <View className='analysis-container'>
      <View className='analysis-title'>{title}</View>
      {children}
      <Text>{content || '暂无该分值的解读'}</Text>
    </View>
  )
}

export default BaseAnalysisShowCard
