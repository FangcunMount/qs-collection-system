import React, { useState, useMemo, useEffect, useCallback } from "react";
import Taro from "@tarojs/taro";
import TesteeSheet from "./TesteeSheet";
import FilterSheet from "./FilterSheet";
import AnswersheetList from "./AnswersheetList";
import BottomSheet from "./BottomSheet";
import { getAssessments } from "../../../../services/api/assessmentApi";
import "../index.less";

const formatDate = (value) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const resolveDateRange = (timeRange) => {
  if (!timeRange) return {};
  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() + 1);

  if (timeRange === "7" || timeRange === "30") {
    const start = new Date(today);
    start.setDate(start.getDate() - Number(timeRange));
    return {
      dateFrom: formatDate(start),
      dateTo: formatDate(end)
    };
  }

  return {};
};

/**
 * 测评记录主组件（整合筛选和分页）
 */
const AnswersheetListImp = ({
  testee,
  statusFilter = "",
  showFilterBar = true,
  showTesteeSheet = false,
  showFilterSheet = false,
  testeeList = [],
  selectedTesteeId = '',
  onSelectTestee,
  onCloseTesteeSheet,
  onCloseFilterSheet,
  onScaleCapsuleInfo
}) => {
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0
  });
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedScaleCode, setSelectedScaleCode] = useState('');
  const [showScaleSheet, setShowScaleSheet] = useState(false);
  const [timeRange, setTimeRange] = useState('7');
  const [riskLevel, setRiskLevel] = useState('');

  const fetchRecords = useCallback(async (page = 1, append = false) => {
    try {
      if (!append) {
        setLoading(true);
      }

      if (!testee?.id) {
        return;
      }

      const pageSize = 20;
      const { dateFrom, dateTo } = resolveDateRange(timeRange);
      const result = await getAssessments({
        testeeId: testee.id,
        status: statusFilter,
        scaleCode: selectedScaleCode,
        riskLevel,
        dateFrom,
        dateTo,
        page,
        pageSize
      });

      const data = result.data || result;
      const items = (data.items || []).map(item => ({
        id: item.id,
        answer_sheet_id: item.answer_sheet_id,
        title: item.scale_name || item.questionnaire_code || '未知量表',
        description: item.scale_code || item.questionnaire_code || '',
        createtime: item.submitted_at || item.created_at,
        status: item.status,
        score: item.total_score,
        risk_level: item.risk_level || item.riskLevel || null,
        questionnaire_code: item.questionnaire_code,
        questionnaire_version: item.questionnaire_version,
        scale_code: item.scale_code,
        scale_name: item.scale_name,
        interpreted_at: item.interpreted_at,
        origin_type: item.origin_type,
      }));

      setRecords(prev => (append ? [...prev, ...items] : items));
      setPagination({
        page: data.page || page,
        page_size: data.page_size || pageSize,
        total: data.total || 0,
        total_pages: data.total_pages || 0
      });
    } catch (error) {
      console.error('获取测评记录失败：', error);
      Taro.showToast({
        title: error.message || '加载失败，请重试',
        icon: 'none'
      });
    } finally {
      setLoading(false);
    }
  }, [riskLevel, selectedScaleCode, statusFilter, testee, timeRange]);

  useEffect(() => {
    if (!testee?.id) return;
    fetchRecords(1, false);
  }, [fetchRecords, testee]);

  const handleLoadMore = async () => {
    if (pagination.page >= pagination.total_pages) {
      Taro.showToast({
        title: '没有更多数据了',
        icon: 'none'
      });
      return;
    }
    await fetchRecords(pagination.page + 1, true);
  };

  const scaleList = useMemo(() => {
    const scaleMap = new Map();
    records.forEach((item) => {
      const code = item.scale_code || item.questionnaire_code || '';
      const name = item.scale_name || item.title || '未知量表';
      if (code && !scaleMap.has(code)) {
        scaleMap.set(code, { code, name });
      }
    });

    const scales = Array.from(scaleMap.values());
    if (selectedScaleCode && !scaleMap.has(selectedScaleCode)) {
      scales.unshift({ code: selectedScaleCode, name: selectedScaleCode });
    }

    return [{ code: '', name: '全部量表' }, ...scales];
  }, [records, selectedScaleCode]);

  const selectedScale = scaleList.find(scale => scale.code === selectedScaleCode) || scaleList[0];

  useEffect(() => {
    if (!onScaleCapsuleInfo || !showFilterBar) return;
    onScaleCapsuleInfo({
      scaleList,
      selectedScaleCode,
      selectedScale,
      showScaleSheet,
      onSelectScale: (code) => {
        setSelectedScaleCode(code);
        setShowScaleSheet(false);
      },
      onOpenScaleSheet: () => setShowScaleSheet(true),
      onCloseScaleSheet: () => setShowScaleSheet(false)
    });
  }, [onScaleCapsuleInfo, scaleList, selectedScale, selectedScaleCode, showFilterBar, showScaleSheet]);

  const renderSheets = () => (
    <>
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

      {showFilterSheet && (
        <BottomSheet
          isOpened={showFilterSheet}
          onClose={onCloseFilterSheet}
          title="筛选"
          height="60vh"
          showConfirm={true}
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

  return (
    <>
      <AnswersheetList
        testee={testee}
        scaleList={scaleList}
        selectedScaleCode={selectedScaleCode}
        onSelectScale={(code) => {
          setSelectedScaleCode(code);
          setShowScaleSheet(false);
        }}
        showScaleSheet={showScaleSheet}
        onCloseScaleSheet={() => setShowScaleSheet(false)}
        answersheetList={records}
        pagination={pagination}
        loading={loading}
        onLoadMore={handleLoadMore}
      />
      {renderSheets()}
    </>
  );
};

export default AnswersheetListImp;
