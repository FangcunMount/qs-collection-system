import React, { useEffect, useState } from "react";
import monent from "moment";
import { isInteger } from "lodash";
import Taro from "@tarojs/taro";
import { View, Image, Text } from "@tarojs/components";
import { AtList, AtListItem, AtLoadMore } from "taro-ui";

import "../index.less";
import emptyData from "../../../assets/images/empty_data.png";

import "taro-ui/dist/style/components/list.scss";
import "taro-ui/dist/style/components/load-more.scss";
import "taro-ui/dist/style/components/activity-indicator.scss";
import "taro-ui/dist/style/components/button.scss";

import { getAnswersheetList } from "../../../services/api/answersheetApi";

const AnswersheetListImp = ({ testee }) => {
  const [ defaultLimit ] = useState(10);
  const [ limit, setLimit ] = useState(defaultLimit);
  const [ answersheetList, setAnswersheetList ] = useState([]);
  const [ loadMoreConfig, setLoadMoreConfig ] = useState({
    status: 'more'
  });

  // 初始化答卷列表
  useEffect(() => {
    if (!testee || !testee.id) {
      return;
    }

    initAnswersheetList();

  }, [testee]);

  // 设置加载更多按钮状态
  useEffect(() => {
    if (answersheetList.length < defaultLimit || !isInteger(answersheetList.length / defaultLimit)) {
      setLoadMoreConfig({
        status: 'noMore'
      });
    } else if (answersheetList.length >= limit) {
      setLoadMoreConfig({
        status: 'more'
      });
    }    
  }, [answersheetList]);

  // 获取答卷列表  
  const initAnswersheetList = () => {
    getAnswersheetList(testee.id, limit).then(data => {
      setAnswersheetList(data.list);
    });
  }

  // 获取答卷的填写时间
  const getWriteTime = (time) => {
    const date = new Date(time);

    // 填写日期为当年，则只返回时间格式： MM-DD HH:MM
    if (date.getFullYear() === new Date().getFullYear()) {
      return monent(date).format('MM-DD HH:mm');
    }

    // 填写日期不为当年，则返回完整日期格式：YYYY-MM-DD
    return monent(date).format('YYYY-MM-DD');
  }

  const handleLoadMore = () => {
    const theLimit = limit + defaultLimit;

    getAnswersheetList(testee.id, theLimit).then(data => {
      setAnswersheetList(data.list);
      setLimit(data.list.length);
    });
  }

  // 跳转到答卷详情页
  const jumpToAnswersheet = (answersheetId) => {
    Taro.navigateTo({
      url: `/pages/answersheet/index?a=${answersheetId}`
    });
  }
    
  return (
      <>
        {
          answersheetList.length === 0 ?
            <View>
              <View class='empty-data-box'>
                <Image class='empty-data__img' src={emptyData}></Image>
                <Text class='empty-data__text'> 暂无测评记录 </Text>
              </View>
            </View>
            :
            <View>
              <View class='answersheet-list-box'>
                <AtList>
                  {
                    answersheetList.map(answersheet => {
                      return (
                        <AtListItem 
                          title={answersheet.title} 
                          extraText={getWriteTime(answersheet.createtime)} 
                          arrow='right' 
                          onClick={ jumpToAnswersheet.bind(this, answersheet.id) }
                        />
                      )
                    })
                  }
                </AtList>

                <AtLoadMore
                  onClick={handleLoadMore.bind(this)}
                  status={loadMoreConfig.status}
                  moreBtnStyle={{ 
                    height: '35px', 
                    lineHeight: '35px', 
                    color: '#478de2', 
                    border: '1px solid #478de2', 
                    width: '33%', 
                    margin: '0 auto', 
                    borderRadius: '20px' 
                  }}
                />
              </View>
            </View>
        }
    </>
  )
}

export default AnswersheetListImp;
