import React from "react";

import QuestionnaireForm from "@/modules/questionnaire/components/QuestionnaireForm";
import SinglePageQuestionnaire from "@/modules/questionnaire/components/SinglePageQuestionnaire";

import type { AssessmentAnsweringViewModel } from "../types";

export interface AssessmentAnsweringViewProps {
  viewModel: AssessmentAnsweringViewModel;
}

const AssessmentAnsweringView = ({ viewModel }: AssessmentAnsweringViewProps) => {
  const sharedProps = {
    questionnaireCode: viewModel.questionnaireCode,
    initialQuestionnaire: viewModel.questionnaire,
    submitContract: viewModel.submitContract,
    subSignid: viewModel.subSignid,
    writedCallback: viewModel.onWritten,
    canSubmit: viewModel.canSubmit,
  };

  return viewModel.isSinglePage ? (
    <SinglePageQuestionnaire
      {...sharedProps}
      variant={viewModel.isPersonality ? "personality" : "default"}
    />
  ) : (
    <QuestionnaireForm {...sharedProps} />
  );
};

export default AssessmentAnsweringView;
