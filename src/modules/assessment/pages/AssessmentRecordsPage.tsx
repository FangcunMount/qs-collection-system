import React, { useCallback, useEffect, useRef, useState } from "react";
import Taro, { useRouter } from "@tarojs/taro";

import BottomMenu from "@/shared/ui/BottomMenu";
import PageShell from "@/shared/ui/PageShell";
import type { DomainTone } from "@/shared/ui/types";
import AssessmentRecordFilterBar from "../components/records/AssessmentRecordFilterBar";
import type { RecordTesteeOption } from "../components/records/AssessmentRecordFilterBar";
import AssessmentRecordListController from "../components/records/AssessmentRecordListController";
import type { ScaleCapsuleInfo } from "../components/records/AssessmentRecordListController";
import { ROUTES, routes } from "@/shared/config/routes";
import { ASSESSMENT_KIND, normalizeAssessmentKind } from "@/shared/lib/assessmentKind";
import {
  findTesteeById,
  getSelectedTesteeId,
  getTesteeList as getStoredTesteeList,
  refreshTesteeList,
  subscribeTesteeStore,
} from "@/shared/stores/testees";
import StatePanel from "@/shared/ui/StatePanel";
import "./AssessmentRecordsPage.less";

interface TesteeStoreSnapshot {
  testeeList: RecordTesteeOption[];
  selectedTesteeId: string;
}

const AssessmentRecordsPage = () => {
  const router = useRouter();
  const assessmentKind = normalizeAssessmentKind(
    router.params?.kind || router.params?.assessment_kind,
  ) || ASSESSMENT_KIND.MEDICAL;
  const tone = assessmentKind as DomainTone;
  const isMedicalReport = assessmentKind === ASSESSMENT_KIND.MEDICAL;
  const [selectedTestee, setSelectedTestee] = useState<RecordTesteeOption | null>(() => {
    const id = getSelectedTesteeId();
    return id ? findTesteeById(id) : null;
  });
  const selectedMemberId = useRef(selectedTestee?.id || "");
  const mounted = useRef(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [scaleCapsuleInfo, setScaleCapsuleInfo] = useState<ScaleCapsuleInfo | null>(null);

  const jumpToRegister = useCallback(() => {
    Taro.redirectTo({
      url: routes.testeeCreate({
        submitClose: 0,
        goUrl: ROUTES.assessmentRecords,
        goParams: "{}",
      }),
    });
  }, []);

  const initTesteeList = useCallback(async () => {
    try {
      await refreshTesteeList();
      if (!mounted.current) return;
      const storedList = getStoredTesteeList() as RecordTesteeOption[];
      if (!storedList.length) {
        jumpToRegister();
        return;
      }
      const currentSelectedId = getSelectedTesteeId();
      setSelectedTestee(storedList.find(item => item.id === currentSelectedId) || null);
    } catch (error) {
      if (!mounted.current) return;
      console.error("初始化档案列表失败:", error);
      Taro.showToast({ title: "加载档案列表失败", icon: "none" });
    }
  }, [jumpToRegister]);

  useEffect(() => {
    mounted.current = true;
    const unsubscribe = subscribeTesteeStore((snapshot: TesteeStoreSnapshot) => {
      if (selectedMemberId.current !== snapshot.selectedTesteeId) {
        selectedMemberId.current = snapshot.selectedTesteeId;
        setScaleCapsuleInfo(null);
        setShowFilterSheet(false);
      }
      setSelectedTestee(snapshot.selectedTesteeId ? findTesteeById(snapshot.selectedTesteeId) : null);
    });
    void initTesteeList();
    return () => { mounted.current = false; unsubscribe(); };
  }, [initTesteeList]);

  return (
    <>
      <PageShell globalTestee tone={tone} className="assessment-record-page">
        {selectedTestee ? (
          <>
            <AssessmentRecordFilterBar
              tone={tone}
              statusFilter={statusFilter}
              scaleOptions={scaleCapsuleInfo?.scaleList}
              selectedScale={scaleCapsuleInfo?.selectedScale}
              onOpenScale={scaleCapsuleInfo?.onOpenScaleSheet}
              onOpenAdvanced={() => setShowFilterSheet(true)}
              onStatusChange={setStatusFilter}
            />
            <AssessmentRecordListController
              key={`${selectedTestee.id}:${assessmentKind}`}
              testee={selectedTestee}
              assessmentKind={assessmentKind}
              statusFilter={statusFilter}
              showFilterBar
              emptyText={isMedicalReport
                ? "完成量表测评后，报告将在这里展示。"
                : "完成人格或能力测评后，报告将在这里展示。"}
              showFilterSheet={showFilterSheet}
              onCloseFilterSheet={() => setShowFilterSheet(false)}
              onScaleCapsuleInfo={setScaleCapsuleInfo}
            />
          </>
        ) : <StatePanel state="empty" title="选择受试者后查看报告" compact />}
      </PageShell>
      <BottomMenu activeKey="报告" />
    </>
  );
};

export default AssessmentRecordsPage;
