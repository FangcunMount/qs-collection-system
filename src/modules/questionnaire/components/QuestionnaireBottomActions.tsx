import React from "react";
import { View } from "@tarojs/components";

import ActionButton from "@/shared/ui/ActionButton";
import BottomActionBar from "@/shared/ui/BottomActionBar";
import type { DomainTone } from "@/shared/ui/types";

export interface QuestionnaireBottomActionsProps {
  tone?: DomainTone;
  previousLabel?: string;
  nextLabel?: string;
  submitLabel?: string;
  previousDisabled?: boolean;
  submitting?: boolean;
  showPrevious?: boolean;
  showNext?: boolean;
  showSubmit?: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  onSubmit?: () => void;
  className?: string;
}

const QuestionnaireBottomActions = ({
  tone = "medical",
  previousLabel = "上一题",
  nextLabel = "下一题",
  submitLabel = "提交问卷",
  previousDisabled = false,
  submitting = false,
  showPrevious = false,
  showNext = false,
  showSubmit = false,
  onPrevious,
  onNext,
  onSubmit,
  className = "",
}: QuestionnaireBottomActionsProps) => (
  <BottomActionBar className={`questionnaire-bottom-actions ${className}`.trim()}>
    <View className="questionnaire-bottom-actions__row">
      {showPrevious ? (
        <ActionButton
          variant="secondary"
          tone={tone}
          disabled={previousDisabled}
          className="questionnaire-bottom-actions__button"
          onClick={onPrevious}
        >
          {previousLabel}
        </ActionButton>
      ) : null}
      {showNext ? (
        <ActionButton
          tone={tone}
          className="questionnaire-bottom-actions__button"
          onClick={onNext}
        >
          {nextLabel}
        </ActionButton>
      ) : null}
      {showSubmit ? (
        <ActionButton
          tone={tone}
          block={!showPrevious}
          loading={submitting}
          className="questionnaire-bottom-actions__button"
          onClick={onSubmit}
        >
          {submitLabel}
        </ActionButton>
      ) : null}
    </View>
  </BottomActionBar>
);

export default QuestionnaireBottomActions;
