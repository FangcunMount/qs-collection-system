import React, { useState, useMemo, useEffect, useCallback } from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import TesteeSheet from "./TesteeSheet";
import FilterSheet from "./FilterSheet";
import AnswersheetList from "./AnswersheetList";
import BottomSheet from "./BottomSheet";
import { getAssessments } from "../../../../services/api/assessmentApi";
import "../index.less"; // 需要 filter-capsule 样式

/**
 * 测评列表主组件（整合各个子组件）
 */
const AnswersheetListImp = ({ 
  testee, 
  showFilterBar = true,
  showTesteeSheet = false,
  showFilterSheet = false,
  testeeList = [],
  selectedTesteeId = '',
  onSelectTestee,
  onCloseTesteeSheet,
  onCloseFilterSheet,
  onScaleCapsuleInfo // callback to pass scale capsule info
}) => {
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0
  });
  const [answersheetList, setAnswersheetList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedScaleCode, setSelectedScaleCode] = useState(''); // 选中的量表代码，空字符串表示"全部"
  const [showScaleSheet, setShowScaleSheet] = useState(false);
  const [timeRange, setTimeRange] = useState('7'); // 7, 30, custom
  const [riskLevel, setRiskLevel] = useState(''); // high, medium, low, ''

  // 获取测评列表  
  const initAnswersheetList = useCallback(async (page = 1, append = false) => {
    try {
      if (!append) {
        setLoading(true);
      }
      
      // 验证 testee.id 是否存在
      if (!testee || !testee.id) {
        console.error('缺少档案ID', { testee });
        Taro.showToast({
          title: '缺少档案信息',
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

    // 切换档案时重置量表筛选
    setSelectedScaleCode('');
    initAnswersheetList();
  }, [testee, initAnswersheetList]);

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
  };

  // 提取所有唯一的量表列表
  const scaleList = useMemo(() => {
    const scaleMap = new Map();
    answersheetList.forEach(item => {
      const scaleCode = item.scale_code || item.questionnaire_code || '';
      const scaleName = item.scale_name || item.title || '未知量表';
      
      if (scaleCode && !scaleMap.has(scaleCode)) {
        scaleMap.set(scaleCode, {
          code: scaleCode,
          name: scaleName
        });
      }
    });
    
    // 转换为数组，并添加"全部"选项
    return [
      { code: '', name: '全部量表' },
      ...Array.from(scaleMap.values())
    ];
  }, [answersheetList]);

  const selectedScale = scaleList.find(scale => scale.code === selectedScaleCode) || scaleList[0];

  // 通过回调传递量表胶囊信息给父组件
  useEffect(() => {
    if (onScaleCapsuleInfo && showFilterBar) {
      onScaleCapsuleInfo({
        scaleList,
        selectedScaleCode,
        selectedScale,
        showScaleSheet,
        onSelectScale: setSelectedScaleCode,
        onOpenScaleSheet: () => setShowScaleSheet(true),
        onCloseScaleSheet: () => setShowScaleSheet(false)
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scaleList, selectedScaleCode, selectedScale, showScaleSheet, showFilterBar]);

  // 渲染弹层（与列表内容同时存在，不互斥）
  const renderSheets = () => (
    <>
      {/* 受试者选择弹层 */}
      {showTesteeSheet && (
        <BottomSheet
          isOpened={showTesteeSheet}
          onClose={onCloseTesteeSheet}
          title="选择档案"
          height="70vh"
        >
          <TesteeSheet
            testeeList={testeeList}
            selectedTesteeId={selectedTesteeId}
            onSelectTestee={onSelectTestee}
          />
        </BottomSheet>
      )}

      {/* 筛选弹层 */}
      {showFilterSheet && (
        <BottomSheet
          isOpened={showFilterSheet}
          onClose={onCloseFilterSheet}
          title="筛选"
          height="60vh"
          showConfirm={true}
          onConfirm={() => {
            // 筛选条件已通过 state 更新，这里可以添加额外的确认逻辑
          }}
        >
          <FilterSheet
            timeRange={timeRange}
            riskLevel={riskLevel}
            onTimeRangeChange={setTimeRange}
            onRiskLevelChange={setRiskLevel}
          />
        </BottomSheet>
      )}
    </>
  );

  // 如果只显示筛选条，返回列表内容
  if (showFilterBar) {
    return (
      <>
        {/* 量表选择弹层由 AnswersheetList 组件内部管理 */}
        <AnswersheetList
          testee={testee}
          scaleList={scaleList}
          selectedScaleCode={selectedScaleCode}
          onSelectScale={setSelectedScaleCode}
          showScaleSheet={showScaleSheet}
          onCloseScaleSheet={() => setShowScaleSheet(false)}
          timeRange={timeRange}
          riskLevel={riskLevel}
          answersheetList={answersheetList}
          pagination={pagination}
          loading={loading}
          onLoadMore={handleLoadMore}
        />
        {renderSheets()}
      </>
    );
  }

  // 显示列表内容
  return (
    <>
      <AnswersheetList
        testee={testee}
        scaleList={scaleList}
        selectedScaleCode={selectedScaleCode}
        onSelectScale={setSelectedScaleCode}
        showScaleSheet={showScaleSheet}
        onCloseScaleSheet={() => setShowScaleSheet(false)}
        timeRange={timeRange}
        riskLevel={riskLevel}
        answersheetList={answersheetList}
        pagination={pagination}
        loading={loading}
        onLoadMore={handleLoadMore}
      />
      {renderSheets()}
    </>
  );
};

export default AnswersheetListImp;
