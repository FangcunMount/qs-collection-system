import React, { useEffect, useState, useMemo, useCallback } from "react";
import moment from "moment";
import Taro from "@tarojs/taro";
import { View, Text } from "@tarojs/components";
import { AtActivityIndicator, AtTabs, AtTabsPane } from "taro-ui";
import { SearchBox, StatusTag, RiskTag } from "../../../../components/common";
import LoadingState from "../../../common/components/LoadingState/LoadingState";
import EmptyState from "../../../common/components/EmptyState/EmptyState";
import { formatWriteTime } from "../../../common/utils/dateFormatters";
import { getAssessmentStatus } from "../../../common/utils/statusFormatters";

import "../index.less";
import { getAssessments } from "../../../../services/api/assessmentApi";

const AnswersheetListImp = ({ testee }) => {
  const [ pagination, setPagination ] = useState({
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0
  });
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
  const initAnswersheetList = useCallback(async (page = 1, append = false) => {
    try {
      if (!append) {
        setLoading(true);
      }
      
      // 验证 testee.id 是否存在
      if (!testee || !testee.id) {
        console.error('缺少受试者ID', { testee });
        Taro.showToast({
          title: '缺少受试者信息',
          icon: 'none'
        });
        return;
      }
      
      const pageSize = 20;
      const result = await getAssessments(testee.id, undefined, page, pageSize);
      
      // API 返回的数据结构：{ data: { items: [], page, page_size, total, total_pages } }
      const data = result.data || result;
      const assessmentList = (data.items || []).map(item => {
        // 确保 risk_level 正确提取（可能在不同字段中）
        const riskLevel = item.risk_level || item.riskLevel || null;
        
        return {
          id: item.id,
          answer_sheet_id: item.answer_sheet_id,
          title: item.scale_name || item.questionnaire_code || '未知量表',
          description: item.scale_code || item.questionnaire_code || '',
          createtime: item.submitted_at || item.created_at,
          status: item.status, // submitted/interpreting/interpreted/completed/failed
          score: item.total_score,
          risk_level: riskLevel, // high/medium/low/normal
          questionnaire_code: item.questionnaire_code,
          questionnaire_version: item.questionnaire_version,
          scale_code: item.scale_code,
          scale_name: item.scale_name,
          interpreted_at: item.interpreted_at,
          origin_type: item.origin_type,
        };
      });
      
      if (append) {
        setAnswersheetList(prev => [...prev, ...assessmentList]);
      } else {
        setAnswersheetList(assessmentList);
      }
      
      // 更新分页信息
      setPagination({
        page: data.page || page,
        page_size: data.page_size || pageSize,
        total: data.total || 0,
        total_pages: data.total_pages || 0
      });
    } catch (error) {
      console.error('获取测评列表失败：', error);
      Taro.showToast({
        title: error.message || '加载失败，请重试',
        icon: 'none'
      });
    } finally {
      setLoading(false);
    }
  }, [testee]);

  // 初始化答卷列表
  useEffect(() => {
    if (!testee || !testee.id) {
      return;
    }

    initAnswersheetList();
  }, [testee, initAnswersheetList]);


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
          item.status === 'interpreted' || item.status === 'completed'
        );
        break;
      case 3: // 仅看异常
        filtered = filtered.filter(item => 
          (item.status === 'interpreted' || item.status === 'completed') && 
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
    if (pagination.page >= pagination.total_pages) {
      Taro.showToast({
        title: '没有更多数据了',
        icon: 'none'
      });
      return;
    }
    
    const nextPage = pagination.page + 1;
    await initAnswersheetList(nextPage, true);
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
  
  
  // 渲染答卷卡片
  const renderAnswersheetCard = (answersheet) => {
    const status = getAssessmentStatus(answersheet);
    
    return (
      <View key={answersheet.id} className="answersheet-card">
        {/* 标题和时间 */}
        <View className="card-header">
          <View className="card-title-wrapper">
            <Text className="card-title">{answersheet.title}</Text>
            {answersheet.scale_code && (
              <Text className="card-code">{answersheet.scale_code}</Text>
            )}
          </View>
          <Text className="card-time">{formatWriteTime(answersheet.createtime)}</Text>
        </View>
        
        {/* 状态标签和风险等级 */}
        <View className="card-tags">
          <StatusTag status={status} />
          {/* 显示风险等级（在 interpreted 或 completed 状态下显示） */}
          {answersheet.risk_level && (answersheet.status === 'interpreted' || answersheet.status === 'completed') && (
            <RiskTag riskLevel={answersheet.risk_level} />
          )}
        </View>
        
        {/* 操作区 */}
        <View className="card-actions">
          <View className="card-score">
            {status === 'pending' && (
              <Text className="score-text-pending">待解读</Text>
            )}
            {status === 'generating' && (
              <Text className="score-text-generating">分析中...</Text>
            )}
            {status === 'failed' && (
              <Text className="score-text-failed">解读失败</Text>
            )}
            {(status === 'normal' || status === 'abnormal') && answersheet.score !== undefined && answersheet.score !== null && (
              <Text className={`score-text-${status}`}>总分: {answersheet.score}</Text>
            )}
            {status === 'normal' && (answersheet.score === undefined || answersheet.score === null) && (
              <Text className="score-text-normal">已完成</Text>
            )}
          </View>
          
          <View className="card-buttons">
            {status === 'pending' && (
              <View className="btn btn-primary-full" onClick={() => jumpToAnswersheetDetail(answersheet)}>
                <Text className="btn-text">查看详情</Text>
              </View>
            )}
            {status === 'generating' && (
              <View className="btn btn-disabled">
                <Text className="btn-text">报告生成中</Text>
              </View>
            )}
            {status === 'failed' && (
              <View className="btn btn-secondary" onClick={() => jumpToAnswersheetDetail(answersheet)}>
                <Text className="btn-text">查看详情</Text>
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
  

  return (
    <View className="answersheet-list-page">
      {/* 搜索和筛选区 */}
      <View className="search-filter-section">
        {/* 搜索框 */}
        <SearchBox
          placeholder="搜索量表名称或症状..."
          value={searchText}
          onInput={(e) => setSearchText(e.detail.value)}
        />

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
          <LoadingState content="加载中..." />
        ) : filteredAnswersheetList.length > 0 ? (
          <View className="answersheet-list">
            {filteredAnswersheetList.map(answersheet => renderAnswersheetCard(answersheet))}
            
            {/* 加载更多 */}
            {pagination.page < pagination.total_pages && (
              <View className="load-more" onClick={handleLoadMore}>
                <Text className="load-more-text">加载更多</Text>
              </View>
            )}
          </View>
        ) : (
          <EmptyState 
            text="暂无测评记录" 
            icon="📋"
          />
        )}
      </View>
    </View>
  );
}

export default AnswersheetListImp;
