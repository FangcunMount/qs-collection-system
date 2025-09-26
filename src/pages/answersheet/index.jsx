import React, { useEffect, useState } from "react";
import Taro from "@tarojs/taro";
import { View } from "@tarojs/components";

import { AtButton } from "taro-ui";
import "taro-ui/dist/style/components/button.scss";
import "taro-ui/dist/style/components/loading.scss";

import "./index.less";
import PageContainer from "../../components/pageContainer/pageContainer";
import api from "../../services/index";
import Section from "../../components/question/section";
import Radio from "../../components/question/radio";
import Checkbox from "../../components/question/checkbox";
import Text from "../../components/question/text";
import Number from "../../components/question/number";
import Textarea from "../../components/question/textarea";
import Date from "../../components/question/date";
import ScoreRadio from "../../components/question/scoreRadio";
import Select from "../../components/question/select";
import ImageRadio from "../../components/question/imageRadio";
import ImageCheckBox from "../../components/question/imageCheckBox";
import Upload from "../../components/question/upload";

import NeedDialog from "../../components/needDialog";
import ExportImageDialog from "./widget/exportImageDialog";
import { getLogger } from "../../util/log";

import { PrivacyAuthorization } from "../../components/privacyAuthorization/privacyAuthorization";

const PAGE_NAME = "answersheet";
const logger = getLogger(PAGE_NAME);

const AnswerSheet = () => {
  const [questions, setQuestions] = useState([]);
  const [answersheetid, setAnswersheetid] = useState(-1);

  const [needCloseFlag, setNeedCloseFlag] = useState(false);
  const [exportImageFlag, setExportImageFlag] = useState(false);

  useEffect(() => {
    const params = Taro.getCurrentInstance().router.params;
    logger.RUN("did effect <RUN> | params: ", { answersheetid: params.a });
    initAnswerSheet(params.a);
  }, []);

  const initAnswerSheet = id => {
    setAnswersheetid(id);

    api
      .getAnswersheet(id)
      .then(result => {
        setQuestions(result.answersheet.answers);
      })
      .catch(err => {
        if (err.errno == "100403") {
          setNeedCloseFlag(true);
        }
      });
  };

  const getQuestionComp = (v, i) => {
    switch (v.type) {
      case "Section":
        return <Section item={v} index={i}></Section>;
      case "Radio":
        return (
          <Radio
            item={v}
            index={i}
            disabled
            onChangeValue={() => {}}
            onChangeExtend={() => {}}
          ></Radio>
        );
      case "CheckBox":
        return (
          <Checkbox
            item={v}
            index={i}
            disabled
            onChangeValue={() => {}}
            onChangeExtend={() => {}}
          />
        );
      case "Text":
        return <Text item={v} index={i} disabled onChangeValue={() => {}} />;
      case "Textarea":
        return (
          <Textarea item={v} index={i} disabled onChangeValue={() => {}} />
        );
      case "Number":
        return <Number item={v} index={i} disabled onChangeValue={() => {}} />;
      case "Date":
        return <Date item={v} index={i} disabled onChangeValue={() => {}} />;
      case "ScoreRadio":
        return (
          <ScoreRadio
            item={v}
            index={i}
            disabled
            onChangeValue={() => {}}
            onChangeExtend={() => {}}
          ></ScoreRadio>
        );
      case "ImageRadio":
        return (
          <ImageRadio
            item={v}
            index={i}
            disabled
            onChangeValue={() => {}}
            onChangeExtend={() => {}}
          ></ImageRadio>
        );
      case "ImageCheckBox":
        return (
          <ImageCheckBox
            item={v}
            index={i}
            disabled
            onChangeValue={() => {}}
            onChangeExtend={() => {}}
          ></ImageCheckBox>
        );
      case "Select":
        return <Select item={v} index={i} disabled onChangeValue={() => {}} />;
      case "Upload":
        return <Upload item={v} index={i} disabled onChangeValue={() => {}} />;
      default:
        return "";
    }
  };

  const getPageHearderEl = () => {
    return (
      <View
        className="s-row"
        style={{ justifyContent: "flex-end", padding: "32rpx 0rpx" }}
      >
        <View className="s-row" style={{ width: "120px" }}>
          <AtButton
            size="small"
            type="primary"
            onClick={() => {
              Taro.redirectTo({
                url: `/pages/analysis/index?a=${answersheetid}`
              });
            }}
          >
            查看解读报告
          </AtButton>
          <View style={{ display: "none" }}>
            <AtButton
              size="small"
              type="primary"
              onClick={() => {
                setExportImageFlag(true);
              }}
            >
              导出原始答卷
            </AtButton>
          </View>
        </View>
      </View>
    );
  };

  return (
    <>
      {exportImageFlag && (
        <ExportImageDialog
          onClose={() => setExportImageFlag(false)}
          onOk={() => setExportImageFlag(false)}
          questions={questions}
          flag={exportImageFlag}
        ></ExportImageDialog>
      )}
      <PageContainer header={getPageHearderEl()}>
        <NeedDialog
          flag={needCloseFlag}
          title="警告"
          content="您没有查看该答卷的权限！"
        ></NeedDialog>
        {questions.map((v, i) => (
          <View key={v.code} className="as-question__container">
            {getQuestionComp(v, i)}
          </View>
        ))}
      </PageContainer>

      <PrivacyAuthorization />
    </>
  );
};

export default AnswerSheet;
