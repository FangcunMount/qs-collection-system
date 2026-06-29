import React, { useState, useMemo, useEffect, useCallback } from "react";
import Taro from "@tarojs/taro";
import TesteeSheet from "./TesteeSheet";
import FilterSheet from "./FilterSheet";
import AssessmentRecordList from "./AssessmentRecordList";
import BottomSheet from "./BottomSheet";
import { getAssessments } from "@/services/api/assessments";
import { buildAssessmentScanTargetUrl, isScanCancelError } from "@/shared/lib/entryScan";
import { normalizeAssessmentKind, resolveAssessmentKind } from "@/shared/lib/assessmentKind";
import "../../pages/AssessmentRecordsPage.less";

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
const AssessmentRecordListContainer = ({
  testee,
  assessmentKind = "",
  statusFilter = "",
  pageSize = 20,
  showFilterBar = true,
  showTesteeSheet = false,
  showFilterSheet = false,
  emptyText,
  emptyButtonText = "重新扫码",
  showEmptyButton = true,
  showLoadMore = true,
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
  const normalizedAssessmentKind = useMemo(
    () => normalizeAssessmentKind(assessmentKind),
    [assessmentKind]
  );

  const mapAssessmentRecord = useCallback((item) => {
    const recordKind = resolveAssessmentKind(item);

    return {
      id: item.id,
      answer_sheet_id: item.answer_sheet_id,
      title: item.scale_name || item.model_name || item.questionnaire_code || '未知量表',
      description: item.scale_code || item.model_code || item.questionnaire_code || '',
      createtime: item.submitted_at || item.created_at,
      status: item.status,
      score: item.total_score,
      risk_level: item.risk_level || item.riskLevel || null,
      questionnaire_code: item.questionnaire_code,
      questionnaire_version: item.questionnaire_version,
      questionnaire_type: item.questionnaire_type || item.questionnaireType,
      scale_code: item.scale_code,
      scale_name: item.scale_name,
      model_code: item.model_code,
      model_name: item.model_name,
      interpreted_at: item.interpreted_at,
      origin_type: item.origin_type,
      assessment_kind: item.assessment_kind || item.assessmentKind || item.kind || recordKind,
      kind: recordKind,
      model_extra: item.model_extra || item.modelExtra,
    };
  }, []);

  const shouldKeepRecord = useCallback((record) => {
    if (!normalizedAssessmentKind) {
      return true;
    }
    return resolveAssessmentKind(record) === normalizedAssessmentKind;
  }, [normalizedAssessmentKind]);

  const fetchRecords = useCallback(async (page = 1, append = false) => {
    try {
      if (!append) {
        setLoading(true);
      }

      if (!testee?.id) {
        return;
      }

      const { dateFrom, dateTo } = resolveDateRange(timeRange);
      const shouldFilterKind = Boolean(normalizedAssessmentKind);
      const items = [];
      let currentPage = page;
      let consumedPage = page - 1;
      let totalPages = 0;
      let total = 0;

      while (currentPage) {
        const result = await getAssessments({
          testeeId: testee.id,
          status: statusFilter,
          scaleCode: selectedScaleCode,
          riskLevel,
          dateFrom,
          dateTo,
          page: currentPage,
          pageSize
        });

        const data = result.data || result;
        consumedPage = Math.max(Number(data.page || currentPage), currentPage);
        totalPages = Number(data.total_pages || 0);
        total = Number(data.total || 0);

        items.push(
          ...(data.items || [])
            .map(mapAssessmentRecord)
            .filter(shouldKeepRecord)
        );

        if (!shouldFilterKind || items.length >= pageSize || consumedPage >= totalPages) {
          break;
        }

        currentPage = consumedPage + 1;
      }

      setRecords(prev => (append ? [...prev, ...items] : items));
      setPagination({
        page: consumedPage,
        page_size: pageSize,
        total,
        total_pages: totalPages
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
  }, [
    mapAssessmentRecord,
    normalizedAssessmentKind,
    pageSize,
    riskLevel,
    selectedScaleCode,
    shouldKeepRecord,
    statusFilter,
    testee,
    timeRange
  ]);

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

  const handleEmptyScan = useCallback(async () => {
    try {
      const result = await Taro.scanCode({
        onlyFromCamera: false,
        scanType: ["qrCode"]
      });
      const targetUrl = buildAssessmentScanTargetUrl(result);
      if (!targetUrl) {
        Taro.showToast({
          title: "未识别到可用测评入口",
          icon: "none"
        });
        return;
      }
      Taro.navigateTo({ url: targetUrl });
    } catch (error) {
      if (isScanCancelError(error)) {
        return;
      }
      console.error("记录中心重新扫码失败：", error);
      Taro.showToast({
        title: "扫码失败，请重试",
        icon: "none"
      });
    }
  }, []);

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
      <AssessmentRecordList
        testeeId={testee?.id}
        scaleList={scaleList}
        selectedScaleCode={selectedScaleCode}
        onSelectScale={(code) => {
          setSelectedScaleCode(code);
          setShowScaleSheet(false);
        }}
        showScaleSheet={showScaleSheet}
        onCloseScaleSheet={() => setShowScaleSheet(false)}
        records={records}
        pagination={pagination}
        loading={loading}
        onLoadMore={handleLoadMore}
        onEmptyScan={handleEmptyScan}
        emptyText={emptyText}
        emptyButtonText={emptyButtonText}
        showEmptyButton={showEmptyButton}
        showLoadMore={showLoadMore}
      />
      {renderSheets()}
    </>
  );
};

export default AssessmentRecordListContainer;
