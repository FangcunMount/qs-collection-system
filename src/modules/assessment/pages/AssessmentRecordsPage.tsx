import React, { useCallback, useEffect, useState } from "react";
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
  setSelectedTesteeId,
  subscribeTesteeStore,
} from "@/shared/stores/testees";
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
  const [testeeList, setTesteeList] = useState<RecordTesteeOption[]>(() => getStoredTesteeList());
  const [selectedTesteeId, setSelectedTesteeIdState] = useState(() => getSelectedTesteeId() || "");
  const [selectedTestee, setSelectedTestee] = useState<RecordTesteeOption | null>(() => {
    const id = getSelectedTesteeId();
    return id ? findTesteeById(id) : null;
  });
  const [statusFilter, setStatusFilter] = useState("");
  const [showTesteeSheet, setShowTesteeSheet] = useState(false);
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
      const storedList = getStoredTesteeList() as RecordTesteeOption[];
      if (!storedList.length) {
        jumpToRegister();
        return;
      }
      setTesteeList(storedList);
      const currentSelectedId = getSelectedTesteeId();
      const nextTestee = storedList.length === 1
        ? storedList[0]
        : storedList.find((item) => String(item.id) === String(currentSelectedId)) || storedList[0];
      setSelectedTesteeId(nextTestee.id);
      setSelectedTestee(nextTestee);
    } catch (error) {
      console.error("初始化档案列表失败:", error);
      Taro.showToast({ title: "加载档案列表失败", icon: "none" });
    }
  }, [jumpToRegister]);

  useEffect(() => {
    const unsubscribe = subscribeTesteeStore((snapshot: TesteeStoreSnapshot) => {
      setTesteeList(snapshot.testeeList);
      setSelectedTesteeIdState(snapshot.selectedTesteeId);
      setSelectedTestee(snapshot.selectedTesteeId ? findTesteeById(snapshot.selectedTesteeId) : null);
    });
    void initTesteeList();
    return unsubscribe;
  }, [initTesteeList]);

  const handleTesteeChange = (testeeId: string) => {
    if (!testeeId) return;
    setSelectedTesteeId(testeeId);
    setSelectedTestee(findTesteeById(testeeId));
    setShowTesteeSheet(false);
  };

  return (
    <>
      <PageShell tone={tone} className="assessment-record-page">
        {selectedTestee ? (
          <>
            <AssessmentRecordFilterBar
              tone={tone}
              testee={selectedTestee}
              testeeCount={testeeList.length}
              statusFilter={statusFilter}
              scaleOptions={scaleCapsuleInfo?.scaleList}
              selectedScale={scaleCapsuleInfo?.selectedScale}
              onOpenTestee={() => setShowTesteeSheet(true)}
              onOpenScale={scaleCapsuleInfo?.onOpenScaleSheet}
              onOpenAdvanced={() => setShowFilterSheet(true)}
              onStatusChange={setStatusFilter}
            />
            <AssessmentRecordListController
              testee={selectedTestee}
              assessmentKind={assessmentKind}
              statusFilter={statusFilter}
              showFilterBar
              emptyText={isMedicalReport
                ? "完成医学量表测评后，报告将在这里展示。"
                : "完成人格或能力测评后，报告将在这里展示。"}
              showTesteeSheet={showTesteeSheet}
              showFilterSheet={showFilterSheet}
              testeeList={testeeList}
              selectedTesteeId={selectedTesteeId}
              onSelectTestee={handleTesteeChange}
              onCloseTesteeSheet={() => setShowTesteeSheet(false)}
              onCloseFilterSheet={() => setShowFilterSheet(false)}
              onScaleCapsuleInfo={setScaleCapsuleInfo}
            />
          </>
        ) : null}
      </PageShell>
      <BottomMenu activeKey="报告" />
    </>
  );
};

export default AssessmentRecordsPage;
