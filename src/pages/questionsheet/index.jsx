import React, { useState } from "react";
import Taro, { useReady, useRouter, useShareAppMessage, AtToast } from "@tarojs/taro";
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
import { getGlobalData, setGlobalData, clearGlobalData } from "../../util/globalData";
import { getLogger } from "../../util/log";
import { isQywx } from "../../util/checkEnvironment";
import { getFromConfig } from "../../config/from";
import { getAnswersheetidBySignid } from "../../services/api/answersheetApi";
import { getForwardConfig } from "../../services/api/share";
import { postAddUsertrack } from "../../services/api/usertrackApi";
import { getMpEntryParams, postReachstore } from "../../services/api/commonApi";

import { PrivacyAuthorization } from "../../components/privacyAuthorization/privacyAuthorization";

const PAGE_NAME = "question_sheet";
const logger = getLogger(PAGE_NAME);
const initShareParams = {
  f: "",
  q: "",
  t: ""
};

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
  const [shareParams, setShareParams] = useState(initShareParams);
  const [testeeType, setTesteeType] = useState("");

  const [canSubmit, setCanSubmit] = useState(true);

  const [needQywxFlag, setNeedQywxFlag] = useState(false);
  const [needWxFlag, setNeedWxFlag] = useState(false);
  const [needTesteeidFlag, setNeedTesteeidFlag] = useState(false);
  const [needWritedCloseFlag, setNeedWritedCloseFlag] = useState(false);

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
        d: doctorid,
        f: fromCode,
        a: fcActivityId,
        signid,
        senderid
      } = result;
      const { clinicid, reach_store } = result;

      if (clinicid && reach_store === "1") {
        postReachstore(clinicid);
      }

      fcActivityId ? setGlobalData("fcActivityId", fcActivityId) : clearGlobalData("fcActivityId");
      doctorid && setGlobalData("doctorid", doctorid);
      senderid && setGlobalData("senderid", senderid);
      fromCode && setGlobalData("from", fromCode);
      signid && setSubSignid(signid);
      result.sp && setIsSinglePage(result.sp === "1");

      beforeEach({ questionsheetCode, testeeid, fromCode, signid }, () => {
        setQuestionsheetid(questionsheetCode);
      });
    });
  }, []);

  useShareAppMessage(() => {
    logger.RUN(
      "useShareAppMessage <RUN>, path: ",
      `pages/questionsheet/index?q=${shareParams.q}&f=${shareParams.f}&t=${shareParams.t}`
    );
    return {
      title: "邀请您填写问卷",
      path: `pages/questionsheet/index?q=${shareParams.q}&f=${shareParams.f}&t=${shareParams.t}`
    };
  });

  const beforeEach = async (params, next) => {
    const { questionsheetCode, fromCode, testeeid, signid } = params;

    const fromConfig = getFromConfig(fromCode);

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

    // 如果环境和允许的配置冲突，阻断后续操作
    if (!envJudgment(fromConfig)) {
      Taro.hideLoading();
      return;
    }

    // 如果没有 testeeid，阻断后续操作
    const verifyTesteeFlag = await verifyTestee(
      fromConfig.needTesteeid,
      testeeid
    );
    if (!verifyTesteeFlag) {
      Taro.hideLoading();
      return;
    }

    if (!getGlobalData("shareTicket") && canShareWeapp()) {
      try {
        const forwardRes = await getForwardConfig();
        setShareParams({
          f: "14",
          t: forwardRes.payload.testeeid,
          q: questionsheetCode
        });
        // eslint-disable-next-line no-undef
        wx.updateShareMenu({
          withShareTicket: true,
          isPrivateMessage: true,
          activityId: forwardRes.activityid,
          success(res) {
            console.log(res);
          },
          fail(res) {
            console.log(res);
          }
        });
      } catch (error) {
        console.log(error);
      }
    }

    handleAddUsertrack(fromCode, questionsheetCode);

    Taro.hideLoading();
    next();
  };

  /**
   * @description: 在进入问卷时，添加用户足迹（门诊扫码、活动）
   * @param {string} fromCode: 来源 code
   * @param {string} questionsheetCode: 问卷 code
   */
  const handleAddUsertrack = (fromCode, questionsheetCode) => {
    if (["5", "16"].includes(fromCode)) {
      let throughType = "";
      let throughid = "";
      const behaviorType = "open_wenjuan";
      const behaviorid = questionsheetCode;
      if (fromCode == "5") {
        throughType = "doctor";
        throughid = getGlobalData("doctorid");
      } else if (fromCode == "16") {
        throughType = "activity";
        throughid = getGlobalData("fcActivityId");
      }

      logger.RUN("handleAddUsertrack <RUN>, params: ", {
        throughType,
        throughid,
        behaviorType,
        behaviorid
      });
      postAddUsertrack(throughType, throughid, behaviorType, behaviorid);
    }
  };

  const canShareWeapp = () => {
    return !getGlobalData("fcActivityId") && !getGlobalData("doctorid");
  };

  /**
   * @description evvironment detection, test for canInfo and canSubmit
   * @param {object} fromConfig: {qwxEnv: {canInto: boolean ...}, wxEnv: {... canSubmit: boolean}, ...}
   * @returns {boolean}
   */
  const envJudgment = fromConfig => {
    if (isQywx()) {
      if (!fromConfig.qwxEnv.canInto) {
        setNeedWxFlag(true);
        return false;
      }
      setCanSubmit(fromConfig.qwxEnv.canSubmit);
    } else {
      if (!fromConfig.wxEnv.canInto) {
        setNeedQywxFlag(true);
        return false;
      }
      setCanSubmit(fromConfig.wxEnv.canSubmit);
    }

    return true;
  };

  const verifyTestee = async (needTesteeid, testeeid) => {
    if (needTesteeid) {
      if (!testeeid) {
        setNeedTesteeidFlag(true);
        return false;
      } else {
        setGlobalData("testeeid", testeeid);
        return true;
      }
    }
    const { testee_type, testee_list } = await getUserTestList(
      getGlobalData("from")
    );

    setTesteeType(testee_type);
    if (testee_type === "patient") {
      if (testee_list.length < 1) {
        setNeedTesteeidFlag(true);
        return false;
      }
    } else if (testee_type === "child") {
      if (testee_list.length < 1) {
        const params = {
          submitClose: "0",
          goUrl: "/pages/questionsheet/index",
          goParams: JSON.stringify(paramData)
        };
        Taro.redirectTo({ url: paramsConcat("/pages/register/index", params) });
        return false;
      } else if (testee_list.length === 1) {
        setGlobalData("testeeid", testee_list[0].id);
      } else {
        setChildList(testee_list);
        setSelectChildFlag(true);
      }
    }

    return true;
  };

  const writedCallback = answersheetid => {
    const fromConfig = getFromConfig(getGlobalData("from"));

    if (fromConfig.needWritedClose) {
      return setNeedWritedCloseFlag(true);
    }

    switch (fromConfig.actionAfterWited) {
      case "goto-analysis":
        Taro.redirectTo({
          url: `/pages/analysis/index?a=${answersheetid}`
        });
        break;
      case "close":
        setNeedWritedCloseFlag(true);
        break;
      default:
        logger.ERROR(
          "writedCallback invoke ERROR_MESSAGE: unknow actionAfterWrited."
        );
        Taro.redirectTo({
          url: `/pages/analysis/index?a=${answersheetid}`
        });
        break;
    }
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
        flag={needWxFlag}
        content="请通过微信扫码登录小程序。"
      ></NeedDialog>
      <NeedDialog
        flag={needQywxFlag}
        content="请通过企业微信扫码登录小程序。"
      ></NeedDialog>
      <NeedDialog
        flag={needTesteeidFlag}
        content="暂无患者，请联系客服。"
      ></NeedDialog>
      <NeedDialog
        flag={needWritedCloseFlag}
        content="填写完成，点击下方按钮返回。"
        btnText="返回"
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
          testeeid={shareParams.t}
          testeeType={testeeType}
        ></QuestionSheet>
      )}

      <PrivacyAuthorization />
    </>
  );
}
