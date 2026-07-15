import React from "react";
import Taro from "@tarojs/taro";

import ActionButton from "@/shared/ui/ActionButton";
import BottomActionBar from "@/shared/ui/BottomActionBar";
import type { DomainTone } from "@/shared/ui/types";
import { routes } from "@/shared/config/routes";

interface ReportCompletionActionProps {
  answerSheetId: string | number;
  taskId?: string;
  tone: DomainTone;
  variant?: "fixed" | "inline";
}

const ReportCompletionAction = ({
  answerSheetId,
  taskId = "",
  tone,
  variant = "fixed",
}: ReportCompletionActionProps) => (
  <BottomActionBar
    className={`report-completion-action report-completion-action--${variant}`}
    elevated={variant === "fixed"}
  >
    <ActionButton
      tone={tone}
      block
      onClick={() => {
        Taro.redirectTo({
          url: routes.assessmentResponse({
            a: answerSheetId,
            task_id: taskId || undefined,
          }),
        });
      }}
    >
      完成并查看测评记录
    </ActionButton>
  </BottomActionBar>
);

export default ReportCompletionAction;
