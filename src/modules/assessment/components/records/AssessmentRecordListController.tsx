import React, { useCallback, useEffect, useMemo, useState } from "react";
import Taro from "@tarojs/taro";

import { loadMedicalAssessmentRecords } from "@/modules/assessment/services/loadMedicalAssessmentRecords";
import { normalizeMedicalAssessmentRecord } from "@/modules/assessment/services/medicalAssessmentRecordMapper";
import { loadPersonalityAssessmentRecords } from "@/modules/assessment/services/personalityAssessmentRecordService";
import { ASSESSMENT_KIND, matchesAssessmentKindFilter, normalizeAssessmentKind } from "@/shared/lib/assessmentKind";
import { buildAssessmentScanTargetUrl, isScanCancelError } from "@/shared/lib/entryScan";
import type { DomainTone } from "@/shared/ui/types";

import {
  buildRecordScaleOptions,
  resolveRecordDateRange,
  toAssessmentRecordViewModel,
} from "../../lib/assessmentRecordsFlow";
import type {
  AssessmentRecordPagination,
  AssessmentRecordScaleOption,
  AssessmentRecordViewModel,
} from "../../types";
import AssessmentRecordList from "./AssessmentRecordList";
import BottomSheet from "./BottomSheet";
import FilterSheet from "./FilterSheet";
import ScaleSheet from "./ScaleSheet";
import TesteeSheet from "./TesteeSheet";
import type { RecordTesteeOption } from "./AssessmentRecordFilterBar";

const loadPersonalityRecords = loadPersonalityAssessmentRecords as (params: {
  testeeId: string;
  statusFilter: string;
  page: number;
  pageSize: number;
}) => Promise<{
  items: Array<Record<string, unknown>>;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}>;

const TypedScaleSheet = ScaleSheet as React.ComponentType<{
  scaleList: AssessmentRecordScaleOption[];
  selectedScaleCode: string;
  onSelectScale: (code: string) => void;
  showScaleSheet: boolean;
  onClose: () => void;
}>;

const TypedTesteeSheet = TesteeSheet as React.ComponentType<{
  testeeList: RecordTesteeOption[];
  selectedTesteeId: string;
  onSelectTestee?: (testeeId: string) => void;
}>;

export interface ScaleCapsuleInfo {
  scaleList: AssessmentRecordScaleOption[];
  selectedScaleCode: string;
  selectedScale: AssessmentRecordScaleOption;
  onOpenScaleSheet: () => void;
}

interface AssessmentRecordListControllerProps {
  testee: RecordTesteeOption;
  assessmentKind?: string;
  statusFilter?: string;
  pageSize?: number;
  showFilterBar?: boolean;
  showTesteeSheet?: boolean;
  showFilterSheet?: boolean;
  emptyText?: string;
  emptyButtonText?: string;
  showEmptyButton?: boolean;
  showLoadMore?: boolean;
  testeeList?: RecordTesteeOption[];
  selectedTesteeId?: string;
  onSelectTestee?: (testeeId: string) => void;
  onCloseTesteeSheet?: () => void;
  onCloseFilterSheet?: () => void;
  onScaleCapsuleInfo?: (info: ScaleCapsuleInfo) => void;
}

const DEFAULT_PAGINATION: AssessmentRecordPagination = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
};

const errorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message;
  return "加载失败，请检查网络后重试";
};

const AssessmentRecordListController = ({
  testee,
  assessmentKind = "",
  statusFilter = "",
  pageSize = 20,
  showFilterBar = true,
  showTesteeSheet = false,
  showFilterSheet = false,
  emptyText = "暂无测评记录",
  emptyButtonText = "重新扫码",
  showEmptyButton = true,
  showLoadMore = true,
  testeeList = [],
  selectedTesteeId = "",
  onSelectTestee,
  onCloseTesteeSheet,
  onCloseFilterSheet,
  onScaleCapsuleInfo,
}: AssessmentRecordListControllerProps) => {
  const [pagination, setPagination] = useState<AssessmentRecordPagination>(DEFAULT_PAGINATION);
  const [records, setRecords] = useState<AssessmentRecordViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [medicalListUnavailable, setMedicalListUnavailable] = useState(false);
  const [selectedScaleCode, setSelectedScaleCode] = useState("");
  const [showScaleSheet, setShowScaleSheet] = useState(false);
  const [timeRange, setTimeRange] = useState("7");
  const [riskLevel, setRiskLevel] = useState("");
  const normalizedAssessmentKind = useMemo(
    () => normalizeAssessmentKind(assessmentKind),
    [assessmentKind],
  );
  const tone = (normalizedAssessmentKind || "medical") as DomainTone;

  const fetchRecords = useCallback(async (page = 1, append = false) => {
    if (!testee.id) return;
    setError("");
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      if (!normalizedAssessmentKind || normalizedAssessmentKind === ASSESSMENT_KIND.PERSONALITY) {
        setMedicalListUnavailable(false);
        const result = await loadPersonalityRecords({
          testeeId: testee.id,
          statusFilter,
          page,
          pageSize,
        });
        const nextRecords = result.items.map(toAssessmentRecordViewModel);
        setRecords((previous) => append ? [...previous, ...nextRecords] : nextRecords);
        setPagination({
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: result.totalPages,
        });
        return;
      }

      const { dateFrom, dateTo } = resolveRecordDateRange(timeRange);
      const shouldFilterKind = Boolean(normalizedAssessmentKind);
      const nextRecords: AssessmentRecordViewModel[] = [];
      let currentPage = page;
      let consumedPage = page - 1;
      let totalPages = 0;
      let total = 0;

      while (currentPage) {
        const result = await loadMedicalAssessmentRecords({
          testeeId: testee.id,
          status: statusFilter,
          scaleCode: selectedScaleCode,
          riskLevel,
          dateFrom,
          dateTo,
          assessmentKind: normalizedAssessmentKind || undefined,
          page: currentPage,
          pageSize,
        });
        if (result.unavailable) {
          setMedicalListUnavailable(true);
          break;
        }

        setMedicalListUnavailable(false);
        consumedPage = Math.max(Number(result.page || currentPage), currentPage);
        totalPages = Number(result.totalPages || 0);
        total = Number(result.total || 0);
        nextRecords.push(...result.items
          .map(normalizeMedicalAssessmentRecord)
          .filter((item: Record<string, unknown>) => matchesAssessmentKindFilter(item, normalizedAssessmentKind))
          .map(toAssessmentRecordViewModel));

        if (!shouldFilterKind || nextRecords.length >= pageSize || consumedPage >= totalPages) break;
        currentPage = consumedPage + 1;
      }

      setRecords((previous) => append ? [...previous, ...nextRecords] : nextRecords);
      setPagination({ page: consumedPage, pageSize, total, totalPages });
    } catch (caughtError) {
      console.error("获取测评记录失败：", caughtError);
      setError(errorMessage(caughtError));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [
    normalizedAssessmentKind,
    pageSize,
    riskLevel,
    selectedScaleCode,
    statusFilter,
    testee.id,
    timeRange,
  ]);

  useEffect(() => {
    void fetchRecords(1, false);
  }, [fetchRecords]);

  const scaleList = useMemo(
    () => buildRecordScaleOptions(records, selectedScaleCode),
    [records, selectedScaleCode],
  );
  const selectedScale = scaleList.find((scale) => scale.code === selectedScaleCode) || scaleList[0];

  useEffect(() => {
    if (!onScaleCapsuleInfo || !showFilterBar) return;
    onScaleCapsuleInfo({
      scaleList,
      selectedScaleCode,
      selectedScale,
      onOpenScaleSheet: () => setShowScaleSheet(true),
    });
  }, [onScaleCapsuleInfo, scaleList, selectedScale, selectedScaleCode, showFilterBar]);

  const handleEmptyScan = useCallback(async () => {
    try {
      const result = await Taro.scanCode({ onlyFromCamera: false, scanType: ["qrCode"] });
      const targetUrl = buildAssessmentScanTargetUrl(result);
      if (!targetUrl) {
        Taro.showToast({ title: "未识别到可用测评入口", icon: "none" });
        return;
      }
      Taro.navigateTo({ url: targetUrl });
    } catch (scanError) {
      if (isScanCancelError(scanError)) return;
      console.error("记录中心重新扫码失败：", scanError);
      Taro.showToast({ title: "扫码失败，请重试", icon: "none" });
    }
  }, []);

  const resolvedEmptyText = medicalListUnavailable
    ? "医学量表记录列表接口暂未开放，完成测评后可直接查看报告"
    : emptyText;

  return (
    <>
      <AssessmentRecordList
        tone={tone}
        testeeId={testee.id}
        records={records}
        pagination={pagination}
        loading={loading}
        loadingMore={loadingMore}
        error={error}
        emptyText={selectedScaleCode ? "该量表暂无测评记录" : resolvedEmptyText}
        emptyActionText={emptyButtonText}
        showEmptyAction={showEmptyButton}
        showLoadMore={showLoadMore}
        onRetry={() => void fetchRecords(1, false)}
        onLoadMore={() => void fetchRecords(pagination.page + 1, true)}
        onEmptyAction={handleEmptyScan}
      />
      <TypedScaleSheet
        scaleList={scaleList}
        selectedScaleCode={selectedScaleCode}
        onSelectScale={(code: string) => setSelectedScaleCode(code)}
        showScaleSheet={showScaleSheet}
        onClose={() => setShowScaleSheet(false)}
      />
      {showTesteeSheet ? (
        <BottomSheet isOpened onClose={onCloseTesteeSheet} onConfirm={() => undefined} title="选择档案" height="70vh">
          <TypedTesteeSheet
            testeeList={testeeList}
            selectedTesteeId={selectedTesteeId}
            onSelectTestee={onSelectTestee}
          />
        </BottomSheet>
      ) : null}
      {showFilterSheet ? (
        <BottomSheet isOpened onClose={onCloseFilterSheet} onConfirm={() => undefined} title="筛选" height="60vh" showConfirm>
          <FilterSheet
            timeRange={timeRange}
            riskLevel={riskLevel}
            onTimeRangeChange={setTimeRange}
            onRiskLevelChange={setRiskLevel}
          />
        </BottomSheet>
      ) : null}
    </>
  );
};

export default AssessmentRecordListController;
