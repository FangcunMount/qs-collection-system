import React, { useEffect, useState, useMemo, useCallback } from "react";
import moment from "moment";
import Taro from "@tarojs/taro";
import { View, Text, Input } from "@tarojs/components";
import { AtIcon, AtActivityIndicator, AtTabs, AtTabsPane } from "taro-ui";

import "../index.less";
import { getAssessments } from "../../../../services/api/assessmentApi";

const AnswersheetListImp = ({ testee }) => {
  const [ defaultLimit ] = useState(10);
  const [ limit, setLimit ] = useState(defaultLimit);
  const [ answersheetList, setAnswersheetList ] = useState([]);
  const [ loading, setLoading ] = useState(true);
  const [ searchText, setSearchText ] = useState("");
  const [ activeFilterIndex, setActiveFilterIndex ] = useState(0);
  
  // 筛选标签配置
  const filterTabList = [
    { title: "全部" },
    { title: "最近一周" },
    { title: "已完成" },
    { title: "仅看异常" }
  ];

  // 获取测评列表  
  const initAnswersheetList = useCallback(async () => {
    try {
      setLoading(true);
      
      // 验证 testee.id 是否存在
      if (!testee || !testee.id) {
        console.error('缺少受试者ID', { testee });
        Taro.showToast({
          title: '缺少受试者信息',
          icon: 'none'
        });
        return;
      }
      
      const data = await getAssessments(testee.id, undefined, 1, limit);
      
      // 转换数据结构以适配UI组件
      const assessmentList = (data.items || []).map(item => ({
        id: item.id,
        answer_sheet_id: item.answer_sheet_id,
        title: item.scale_name || item.questionnaire_code,
        description: `测评编号: ${item.scale_code || item.questionnaire_code}`,
        createtime: item.created_at || item.submitted_at,
        status: item.status,
        score: item.total_score,
        risk_level: item.risk_level,
        questionnaire_code: item.questionnaire_code,
        scale_code: item.scale_code,
        interpreted_at: item.interpreted_at,
      }));
      setAnswersheetList(assessmentList);
    } catch (error) {
      console.error('获取测评列表失败：', error);
      Taro.showToast({
        title: error.message || '加载失败，请重试',
        icon: 'none'
      });
    } finally {
      setLoading(false);
    }
  }, [testee, limit]);

  // 初始化答卷列表
  useEffect(() => {
    if (!testee || !testee.id) {
      return;
    }

    initAnswersheetList();
  }, [testee, initAnswersheetList]);

  // 获取答卷的填写时间
  const getWriteTime = (time) => {
    const now = moment();
    const createTime = moment(time);
    
    // 今天
    if (createTime.isSame(now, 'day')) {
      return `今天 ${createTime.format('HH:mm')}`;
    }
    
    // 昨天
    if (createTime.isSame(now.subtract(1, 'day'), 'day')) {
      return `昨天 ${createTime.format('HH:mm')}`;
    }
    
    // 当年，显示月-日
    if (createTime.isSame(now, 'year')) {
      return createTime.format('MM/DD');
    }

    // 不是当年，显示完整日期
    return createTime.format('YYYY/MM/DD');
  }

  // 处理筛选切换
  const handleFilterChange = (index) => {
    setActiveFilterIndex(index);
  };

  // 根据筛选条件过滤答卷列表
  const filteredAnswersheetList = useMemo(() => {
    let filtered = [...answersheetList];
    
    // 根据搜索文本过滤
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase().trim();
      filtered = filtered.filter(item => 
        item.title?.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower) ||
        item.scale_code?.toLowerCase().includes(searchLower) ||
        item.questionnaire_code?.toLowerCase().includes(searchLower)
      );
    }

    // 根据筛选标签过滤
    switch (activeFilterIndex) {
      case 1: // 最近一周
        const oneWeekAgo = moment().subtract(7, 'days');
        filtered = filtered.filter(item => 
          moment(item.createtime).isAfter(oneWeekAgo)
        );
        break;
      case 2: // 已完成
        filtered = filtered.filter(item => 
          item.status === 'completed'
        );
        break;
      case 3: // 仅看异常
        filtered = filtered.filter(item => 
          item.status === 'completed' && 
          (item.risk_level === 'high' || item.risk_level === 'medium')
        );
        break;
      case 0: // 全部
      default:
        // 不进行额外过滤
        break;
    }

    return filtered;
  }, [answersheetList, activeFilterIndex, searchText]);

  const handleLoadMore = async () => {
    const theLimit = limit + defaultLimit;
    try {
      if (!testee || !testee.id) {
        console.error('缺少受试者ID', { testee });
        return;
      }
      
      const data = await getAssessments(testee.id, undefined, 1, theLimit);
      const assessmentList = (data.items || []).map(item => ({
        id: item.id,
        answer_sheet_id: item.answer_sheet_id,
        title: item.scale_name || item.questionnaire_code,
        description: `测评编号: ${item.scale_code || item.questionnaire_code}`,
        createtime: item.created_at || item.submitted_at,
        status: item.status,
        score: item.total_score,
        risk_level: item.risk_level,
        questionnaire_code: item.questionnaire_code,
        scale_code: item.scale_code,
        interpreted_at: item.interpreted_at,
      }));
      setAnswersheetList(assessmentList);
      setLimit(theLimit);
    } catch (error) {
      console.error('加载更多失败：', error);
      Taro.showToast({
        title: error.message || '加载失败',
        icon: 'none'
      });
    }
  }

  // 跳转到答卷详情页
  const jumpToAnswersheetDetail = (assessment) => {
    if (!assessment.answer_sheet_id) {
      Taro.showToast({ title: '答卷信息不存在', icon: 'none' });
      return;
    }
    Taro.navigateTo({
      url: `/pages/answersheet/detail/index?a=${assessment.answer_sheet_id}`
    });
  }
  
  // 跳转到测评报告页
  const jumpToAssessmentReport = (assessment) => {
    if (!assessment.answer_sheet_id) {
      Taro.showToast({ title: '答卷信息不存在', icon: 'none' });
      return;
    }
    // 使用答卷ID跳转，与提交后的跳转逻辑保持一致
    Taro.navigateTo({
      url: `/pages/analysis/index?a=${assessment.answer_sheet_id}`
    });
  }
  
  // 获取测评状态
  const getAnswersheetStatus = (assessment) => {
    // 根据 API 返回的状态判断
    // 状态: submitted(已提交), interpreting(解读中), completed(已完成), failed(失败)
    if (assessment.status === 'interpreting') {
      return 'generating'; // 报告生成中
    }
    if (assessment.status === 'submitted') {
      return 'pending'; // 待解读
    }
    if (assessment.status === 'failed') {
      return 'abnormal'; // 失败
    }
    if (assessment.status === 'completed') {
      // 根据风险等级判断
      if (assessment.risk_level === 'high' || assessment.risk_level === 'medium') {
        return 'abnormal'; // 结果异常
      }
      return 'normal'; // 结果正常
    }
    return 'normal';
  }

  // 渲染状态标签
  const renderStatusTag = (status) => {
    const statusConfig = {
      abnormal: {
        icon: 'alert-circle',
        text: '结果异常',
        bgColor: 'status-tag-abnormal',
      },
      normal: {
        icon: 'check-circle',
        text: '结果正常',
        bgColor: 'status-tag-normal',
      },
      pending: {
        icon: 'clock',
        text: '测评中',
        bgColor: 'status-tag-pending',
      },
      generating: {
        icon: 'reload',
        text: '报告生成中',
        bgColor: 'status-tag-generating',
      },
    };
    
    const config = statusConfig[status] || statusConfig.normal;
    
    return (
      <View className={`status-tag ${config.bgColor}`}>
        <AtIcon value={config.icon} size="12" />
        <Text className="status-tag-text">{config.text}</Text>
      </View>
    );
  };
  
  // 渲染答卷卡片
  const renderAnswersheetCard = (answersheet) => {
    const status = getAnswersheetStatus(answersheet);
    
    return (
      <View key={answersheet.id} className="answersheet-card">
        {/* 标题和时间 */}
        <View className="card-header">
          <Text className="card-title">{answersheet.title}</Text>
          <Text className="card-time">{getWriteTime(answersheet.createtime)}</Text>
        </View>
        
        {/* 描述 */}
        {answersheet.description && (
          <Text className="card-desc">{answersheet.description}</Text>
        )}
        
        {/* 状态标签 */}
        <View className="card-tags">
          {renderStatusTag(status)}
          {answersheet.is_free && (
            <View className="tag tag-free">
              <Text className="tag-text">免费</Text>
            </View>
          )}
          {answersheet.is_professional && (
            <View className="tag tag-professional">
              <Text className="tag-text">专业版</Text>
            </View>
          )}
        </View>
        
        {/* 操作区 */}
        <View className="card-actions">
          <View className="card-score">
            {status === 'pending' && (
              <Text className="score-text-pending">剩余 {answersheet.remaining_questions || 0} 题</Text>
            )}
            {status === 'generating' && (
              <Text className="score-text-generating">分析中...</Text>
            )}
            {(status === 'normal' || status === 'abnormal') && answersheet.score !== undefined && (
              <Text className={`score-text-${status}`}>总分: {answersheet.score}</Text>
            )}
          </View>
          
          <View className="card-buttons">
            {status === 'pending' && (
              <View className="btn btn-primary-full" onClick={() => jumpToAnswersheetDetail(answersheet)}>
                <Text className="btn-text">等待解读</Text>
              </View>
            )}
            {status === 'generating' && (
              <View className="btn btn-disabled">
                <Text className="btn-text">报告生成中</Text>
              </View>
            )}
            {(status === 'normal' || status === 'abnormal') && (
              <>
                <View className="btn btn-secondary" onClick={() => jumpToAnswersheetDetail(answersheet)}>
                  <Text className="btn-text">查看详情</Text>
                </View>
                <View 
                  className={status === 'abnormal' ? 'btn btn-primary' : 'btn btn-outline'}
                  onClick={() => jumpToAssessmentReport(answersheet)}
                >
                  <Text className="btn-text">查看报告</Text>
                </View>
              </>
            )}
          </View>
        </View>
      </View>
    );
  };
  
  // 渲染空状态
  const renderEmptyState = () => (
    <View className="empty-state">
      <View className="empty-icon">📋</View>
      <Text className="empty-title">暂无测评记录</Text>
      <Text className="empty-desc">开始第一次测评吧</Text>
    </View>
  );

  return (
    <View className="answersheet-list-page">
      {/* 搜索和筛选区 */}
      <View className="search-filter-section">
        {/* 搜索框 */}
        <View className="search-box">
          <AtIcon value="search" size="18" color="#9CA3AF" />
          <Input 
            className="search-input"
            placeholder="搜索量表名称或症状..."
            value={searchText}
            onInput={(e) => setSearchText(e.detail.value)}
          />
        </View>

        {/* 筛选标签栏 */}
        <AtTabs
          scroll
          current={activeFilterIndex}
          tabList={filterTabList}
          onClick={handleFilterChange}
        >
          {filterTabList.map((tab, index) => (
            <AtTabsPane key={index} current={activeFilterIndex} index={index}>
              {/* 占位，实际内容在下方答卷列表 */}
            </AtTabsPane>
          ))}
        </AtTabs>
      </View>

      {/* 答卷列表 */}
      <View className="answersheet-list-container">
        {loading ? (
          <View className="loading-state">
            <AtActivityIndicator mode="center" content="加载中..." />
          </View>
        ) : filteredAnswersheetList.length > 0 ? (
          <View className="answersheet-list">
            {filteredAnswersheetList.map(answersheet => renderAnswersheetCard(answersheet))}
            
            {/* 加载更多 */}
            {answersheetList.length >= limit && answersheetList.length % defaultLimit === 0 && (
              <View className="load-more" onClick={handleLoadMore}>
                <Text className="load-more-text">加载更多</Text>
                <AtIcon value="chevron-down" size="14" color="#1890FF" />
              </View>
            )}
          </View>
        ) : (
          renderEmptyState()
        )}
      </View>
    </View>
  );
}

export default AnswersheetListImp;
