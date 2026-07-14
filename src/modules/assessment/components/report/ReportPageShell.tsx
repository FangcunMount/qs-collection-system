import React from "react";

import PageShell from "@/shared/ui/PageShell";
import StatePanel from "@/shared/ui/StatePanel";
import { PrivacyAuthorization } from "@/shared/ui/PrivacyAuthorization";
import type { DomainTone } from "@/shared/ui/types";

import "./ReportPageShell.less";

interface ReportPageShellProps {
  tone: DomainTone;
  children?: React.ReactNode;
  fixedAction?: React.ReactNode;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  className?: string;
}

const ReportPageShell = ({
  tone,
  children,
  fixedAction,
  loading = false,
  error = "",
  onRetry,
  className = "",
}: ReportPageShellProps) => (
  <>
    <PageShell
      tone={tone}
      fixedAction={fixedAction}
      className={["report-page-shell", className].filter(Boolean).join(" ")}
    >
      {loading ? (
        <StatePanel state="loading" tone={tone} title="正在加载测评报告" />
      ) : error ? (
        <StatePanel
          state="error"
          tone={tone}
          title="测评报告加载失败"
          description={error}
          actionText={onRetry ? "重新加载" : undefined}
          onAction={onRetry}
        />
      ) : children}
    </PageShell>
    <PrivacyAuthorization />
  </>
);

export default ReportPageShell;
