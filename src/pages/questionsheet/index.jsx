import React, { useState } from "react";
import Taro, { useReady, useRouter, useShareAppMessage } from "@tarojs/taro";
import "taro-ui/dist/style/components/button.scss";
import "taro-ui/dist/style/components/modal.scss";
import "taro-ui/dist/style/components/loading.scss";
import "taro-ui/dist/style/components/toast.scss";
import "taro-ui/dist/style/components/icon.scss";

import "./index.less";
import NeedDialog from "../../components/needDialog";
import SelectChildDialog from "./weight/selectChildDialog";
import QuestionSheet from "./weight/questionsheet";
import SinglePageModel from "./weight/singlePageModel";
import { getUserTestList } from "../../services/api/user";

import { paramsConcat, parsingScene } from "../../util";
import { getGlobalData, setGlobalData } from "../../util/globalData";
import { getLogger } from "../../util/log";
import { getAnswersheetidBySignid } from "../../services/api/answersheetApi";
import { getMpEntryParams } from "../../services/api/commonApi";

import { PrivacyAuthorization } from "../../components/privacyAuthorization/privacyAuthorization";

const PAGE_NAME = "question_sheet";
const logger = getLogger(PAGE_NAME);
const handleEntryParams = params => {
  return new Promise((resolve, reject) => {
    if (!params.scene) {
      return resolve(params);
    }

    const np = parsingScene(params.scene);
    if (!np.mpqrcodeid) {
      return resolve(np);
    }

    getMpEntryParams(np.mpqrcodeid)
      .then(result => {
        resolve(result.entry_data);
      })
      .catch(err => {
        reject(err);
      });
  });
};

export default function Index() {
  const [questionsheetid, setQuestionsheetid] = useState(null);
  const [subSignid, setSubSignid] = useState("");

  const canSubmit = true;

  const [needTesteeidFlag, setNeedTesteeidFlag] = useState(false);

  const [selectChildFlag, setSelectChildFlag] = useState(false);
  const [childList, setChildList] = useState([]);

  const [isSinglePage, setIsSinglePage] = useState(false);

  const paramData = useRouter().params;

  useReady(() => {
    logger.RUN("did show <RUN>, params: ", { ...paramData });

    Taro.showLoading({ mask: true });

    handleEntryParams(paramData).then(result => {
      logger.RUN("did show <RUN>, cleared params: ", result);
      const {
        q: questionsheetCode,
        t: testeeid,
        signid
      } = result;
      const { clinicid, reach_store } = result;

      signid && setSubSignid(signid);
      result.sp && setIsSinglePage(result.sp === "1");

      beforeEach({ questionsheetCode, testeeid, signid }, () => {
        setQuestionsheetid(questionsheetCode);
      });
    });
  }, []);

  useShareAppMessage(() => ({}));

  const beforeEach = async (params, next) => {
    const { questionsheetCode, testeeid, signid } = params;

    // 如果标记的id已有答卷id，直接跳转至答卷展示
    if (signid) {
      const res = await getAnswersheetidBySignid(signid);
      if (res.answersheetid) {
        Taro.hideLoading();
        Taro.redirectTo({
          url: `/pages/answersheet/index?a=${res.answersheetid}`
        });
        return;
      }
    }

    // 如果没有 testeeid，阻断后续操作
    const verifyTesteeFlag = await verifyTestee(testeeid);
    if (!verifyTesteeFlag) {
      Taro.hideLoading();
      return;
    }

    Taro.hideLoading();
    next();
  };

  const verifyTestee = async testeeid => {
    if (testeeid) {
      setGlobalData("testeeid", testeeid);
      return true;
    }
    const { testee_list = [] } = await getUserTestList();

    if (testee_list.length < 1) {
      setNeedTesteeidFlag(true);
      return false;
    }

    if (testee_list.length === 1) {
      setGlobalData("testeeid", testee_list[0].id);
    } else {
      setChildList(testee_list);
      setSelectChildFlag(true);
    }

    return true;
  };

  const writedCallback = answersheetid => {
    Taro.redirectTo({
      url: `/pages/analysis/index?a=${answersheetid}`
    });
  };

  const handleSelectChild = childid => {
    setGlobalData("testeeid", childid);
    setSelectChildFlag(false);
  };

  const handleAddChild = () => {
    const params = {
      submitClose: "0",
      goUrl: "/pages/questionsheet/index",
      goParams: JSON.stringify(paramData)
    };
    Taro.redirectTo({ url: paramsConcat("/pages/register/index", params) });
  };

  return (
    <>
      <SelectChildDialog
        flag={selectChildFlag}
        childList={childList}
        onSelectChild={handleSelectChild}
        onAddChild={handleAddChild}
      />
      <NeedDialog
        flag={needTesteeidFlag}
        content="暂无受试者，请联系客服。"
      ></NeedDialog>
      {isSinglePage ? (
        <SinglePageModel
          questionsheetid={questionsheetid}
          subSignid={subSignid}
          writedCallback={writedCallback}
          canSubmit={canSubmit}
        ></SinglePageModel>
      ) : (
      <QuestionSheet
        questionsheetid={questionsheetid}
        subSignid={subSignid}
        writedCallback={writedCallback}
        canSubmit={canSubmit}
      ></QuestionSheet>
      )}

      <PrivacyAuthorization />
    </>
  );
}
