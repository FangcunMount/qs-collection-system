import React from "react";

import QsSection from "./questions/section";
import QsRadio from "./questions/radio";
import QsText from "./questions/text";
import QsTextarea from "./questions/textarea";
import QsNumber from "./questions/number";
import QsDate from "./questions/date";
import QsCheckbox from "./questions/checkbox";
import QsScoreRadio from "./questions/scoreRadio";
import QsSelect from "./questions/select";
import QsImageRadio from "./questions/imageRadio";
import QsImageCheckbox from "./questions/imageCheckBox";

import type { QuestionnaireQuestion } from "../types";
import "./questionControls.less";

export interface QuestionRendererProps {
  question: QuestionnaireQuestion;
  index?: number;
  onChangeValue: (value: unknown) => void;
  onChangeExtend: (optionIndex: number, value: unknown) => void;
}

const QuestionRenderer = ({
  question,
  index,
  onChangeValue,
  onChangeExtend,
}: QuestionRendererProps) => {
  const commonProps = {
    item: question,
    index,
    onChangeValue: (value: unknown) => onChangeValue(value),
  };
  const choiceProps = {
    ...commonProps,
    onChangeExtend: (_itemIndex: number, optionIndex: number, value: unknown) => (
      onChangeExtend(optionIndex, value)
    ),
  };

  switch (question.type) {
    case "Section":
      return <QsSection item={question} index={index} />;
    case "Radio":
      return <QsRadio {...choiceProps} />;
    case "ImageRadio":
      return <QsImageRadio {...choiceProps} />;
    case "CheckBox":
      return <QsCheckbox {...choiceProps} />;
    case "ImageCheckBox":
      return <QsImageCheckbox {...choiceProps} />;
    case "Text":
      return <QsText {...commonProps} />;
    case "Textarea":
      return <QsTextarea {...commonProps} />;
    case "Number":
      return <QsNumber {...commonProps} />;
    case "Date":
      return <QsDate {...commonProps} />;
    case "ScoreRadio":
      return <QsScoreRadio {...commonProps} />;
    case "Select":
      return <QsSelect {...commonProps} />;
    default:
      return null;
  }
};

export default QuestionRenderer;
