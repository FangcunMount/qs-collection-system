import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Taro from "@tarojs/taro";

import { loadMedicalAssessmentRecords } from "@/modules/assessment/services/loadMedicalAssessmentRecords";
import { normalizeMedicalAssessmentRecord } from "@/modules/assessment/services/medicalAssessmentRecordMapper";
import { loadBehaviorAssessmentRecords } from "@/modules/assessment/services/behaviorAssessmentRecordService";
import { loadPersonalityAssessmentRecords } from "@/modules/assessment/services/personalityAssessmentRecordService";
import { ASSESSMENT_KIND, normalizeAssessmentKind } from "@/shared/lib/assessmentKind";
import { routes } from "@/shared/config/routes";
import { getSessionRevision } from "@/shared/stores/sessionPrivacy";
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

const loadBehaviorRecords = loadBehaviorAssessmentRecords as (params: {
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
  showFilterSheet?: boolean;
  emptyText?: string;
  emptyButtonText?: string;
  showEmptyButton?: boolean;
  showLoadMore?: boolean;
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
  showFilterSheet = false,
  emptyText = "暂无测评记录",
  emptyButtonText = "去测评",
  showEmptyButton = true,
  showLoadMore = true,
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
  const [timeRange, setTimeRange] = useState(showFilterBar ? "7" : "");
  const [riskLevel, setRiskLevel] = useState("");
  const normalizedAssessmentKind = useMemo(
    () => normalizeAssessmentKind(assessmentKind),
    [assessmentKind],
  );
  const tone = (normalizedAssessmentKind || "medical") as DomainTone;

  const requestVersion = useRef(0);
  const memberId = useRef(testee.id);
  memberId.current = testee.id;

  const fetchRecords = useCallback(async (page = 1, append = false) => {
    const request = ++requestVersion.current;
    const revision = getSessionRevision();
    const valid = () => request === requestVersion.current && memberId.current === testee.id && revision === getSessionRevision();
    if (!testee.id) return;
    if (!append) setRecords([]);
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
        if (!valid()) return;
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

      if (normalizedAssessmentKind === ASSESSMENT_KIND.ABILITY) {
        setMedicalListUnavailable(false);
        const result = await loadBehaviorRecords({
          testeeId: testee.id,
          statusFilter,
          page,
          pageSize,
        });
        if (!valid()) return;
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
      const nextRecords: AssessmentRecordViewModel[] = [];
      const result = await loadMedicalAssessmentRecords({
        testeeId: testee.id,
        status: statusFilter,
        scaleCode: selectedScaleCode,
        riskLevel,
        dateFrom,
        dateTo,
        page,
        pageSize,
      });
      if (!valid()) return;
      if (result.unavailable) {
        setMedicalListUnavailable(true);
      } else {
        setMedicalListUnavailable(false);
        nextRecords.push(...result.items
          .map(normalizeMedicalAssessmentRecord)
          .map(toAssessmentRecordViewModel));
      }

      setRecords((previous) => append ? [...previous, ...nextRecords] : nextRecords);
      setPagination({
        page: Number(result.page || page),
        pageSize: Number(result.pageSize || pageSize),
        total: Number(result.total || 0),
        totalPages: Number(result.totalPages || 0),
      });
    } catch (caughtError) {
      if (!valid()) return;
      console.error("获取测评记录失败：", caughtError);
      setError(errorMessage(caughtError));
    } finally {
      if (valid()) { setLoading(false); setLoadingMore(false); }
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
    return () => { ++requestVersion.current; };
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

  const handleBrowseAssessments = useCallback(() => {
    const url = normalizedAssessmentKind === ASSESSMENT_KIND.PERSONALITY
      ? routes.personalityCatalog()
      : normalizedAssessmentKind === ASSESSMENT_KIND.ABILITY
        ? routes.abilityCatalog()
        : routes.tabScales();
    Taro.navigateTo({ url });
  }, [normalizedAssessmentKind]);

  const resolvedEmptyText = medicalListUnavailable
    ? "量表记录列表接口暂未开放，完成测评后可直接查看报告"
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
        onEmptyAction={handleBrowseAssessments}
      />
      <TypedScaleSheet
        scaleList={scaleList}
        selectedScaleCode={selectedScaleCode}
        onSelectScale={(code: string) => setSelectedScaleCode(code)}
        showScaleSheet={showScaleSheet}
        onClose={() => setShowScaleSheet(false)}
      />
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
