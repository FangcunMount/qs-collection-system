import "../index.less";
import React, { useState } from "react";
import { View, Text, Image } from '@tarojs/components'
import { isArray, isString } from "lodash";
import { AtTabBar, AtTabsPane } from 'taro-ui'

import "taro-ui/dist/style/components/tabs.scss";
import "taro-ui/dist/style/components/tab-bar.scss";
import "taro-ui/dist/style/components/badge.scss";
import "taro-ui/dist/style/components/icon.scss";
import "taro-ui/dist/style/components/article.scss";
import "taro-ui/dist/style/components/flex.scss";

const TScoreAnalysisShowCard = ({ tScores }) => {
  
  // tScore 表头
  const scoreTableHeader = [
    {
        title: '',
        dataIndex: 'title',
        width:'40%',
    },
    {
        title: 'T分',
        dataIndex: 't_score',
        width:'30%',
    },
    {
        title: '原始分',
        dataIndex: 'raw_score',
        width:'30%',
    },
  ];

  // tab状态
  const [tabConfig, setTabConfig] = useState({
    current: 0,
    list: [
      { title: '得分', iconType: 'analytics' },
      { title: '解读', iconType: 'playlist' },
      { title: '量表介绍', iconType: 'folder' }
    ]
  });

  // 切换tab
  const handleSwitchTab = (value) => {
    setTabConfig({
      ...tabConfig,
      current: value
    });
  }
  
  return (
    <View className='tScore-analysis-container'>
      <View className='body'>
        <AtTabsPane className='analysis-tab' current={tabConfig.current} index={0} >
          <View class='tScore-info-tab'>
            <View className='tab-title'>
              测评得分
            </View>

            <View className='tScore-chart'>
              <Image className='at-article__img' src={tScores.chart_url} mode='widthFix' />
            </View>

            <View className="tScore-table">
              <View className="tr bg-header">
                {
                  scoreTableHeader.map((item)=>{
                    return (<View className="th" style={{ width:item.width}}>{item.title}</View>)
                  })
                }
              </View>
              {
                tScores.scores.map((item)=>{
                    return (
                      <View className={item.t_score > 70 ? 'tr score-warning' : 'tr '}>
                      {
                        scoreTableHeader.map((item2)=>{
                          return (     
                            <View className="td" style={{ width:item2.width}}>{item[item2.dataIndex]}</View>
                          )
                        })
                      }
                      </View>
                    )
                })
              }
            </View>  
          </View>
        </AtTabsPane>
        
        <AtTabsPane className='analysis-tab' current={tabConfig.current} index={1}>
          <View className="tScore-interpretation-tab">
            <View className='tab-title'>
                测评解读
            </View>

            {
              tScores.interpretations.map((item)=>{
                if (isString(item.custom_font_content)) {
                  return (
                    <View className='tScore-interpretation-section-title'>
                      <Text>{item.custom_font_content}</Text>
                    </View>
                  );
                } else if (isArray(item.custom_font_content)) {
                  return (
                    <View className="tScore-interpretation-section-content">
                      {
                        item.custom_font_content.map((item2)=>{
                          return (
                            <View className='tScore-interpretation-section-p'>
                              <Text>{item2}</Text>
                            </View>
                          );
                        })
                      }
                    </View>
                  )
                }
              })
            }
          </View>
        </AtTabsPane>
        
        <AtTabsPane className='analysis-tab' current={tabConfig.current} index={2}>
          <View className="tScore-introduction-tab">
            <View className='tab-title'>
                量表介绍
            </View>

            {
              tScores.brief.map((item)=>{
                if (isString(item.custom_font_content)) {
                  return (
                    <View className='tScore-introduction-section-title'>
                      <Text>{item.custom_font_content}</Text>
                    </View>
                  );
                } else if (isArray(item.custom_font_content)) {
                  return (
                    <View className="tScore-introduction-section-content">
                      {
                        item.custom_font_content.map((item2)=>{
                          return (
                            <View className='tScore-introduction-section-p'>
                              <Text>{item2}</Text>
                            </View>
                          );
                        })
                      }
                    </View>
                  )
                }
              })
            }
          </View>
        </AtTabsPane>
      </View>

      <View class="footer">
        <AtTabBar
          tabList={tabConfig.list}
          onClick={handleSwitchTab.bind(this)}
          current={tabConfig.current}
        />
      </View>
    </View>
  )
}

export default TScoreAnalysisShowCard
