import React, { useEffect, useState } from "react";
import { View } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { AtButton, AtActivityIndicator } from "taro-ui";

import { getAnalysis } from "../../../services/api/analysisApi";
import PageContainer from "../../../components/pageContainer/pageContainer";
import TotalAnalysisShowCard from "./widget/totalAnalysisShowCard";
import FactorAnalysisShowCard from "./widget/factorAnalysisShowCard";
import ExportImageDialog from "./widget/exportImageDialog";
import TScoreAnalysisShowCard  from "./widget/TScoreAnalysisShowCard";
import { getLogger } from "../../../util/log";
import { PrivacyAuthorization } from "../../../components/privacyAuthorization/privacyAuthorization";

const PAGE_NAME = "analysis";
const logger = getLogger(PAGE_NAME);

const Analysis = () => {

  const [total, setTotal] = useState(null);
  const [factors, setFactors] = useState([]);
  const [tScores, setTScores] = useState({});
  const [answersheetid, setAnswersheetid] = useState(-1);
  const [exportAnalysisFlag, setExportAnalysisFlag] = useState("");

  const [isReady, setIsReady] = useState(false);
  const [isShowTotalAndFactorAnalysisCard, setIsShowTotalAndFactorAnalysisCard] = useState(false);
  const [isShowTScoreAnalysisCard, setIsShowTScoreAnalysisCard] = useState(false);

  useEffect(() => {
    const params = Taro.getCurrentInstance().router.params;
    logger.RUN("did effect <RUN> | params: ", { answersheetid: params.a });

    initAnalysis(params.a);
    
  }, []);

  useEffect(() => {
    if (tScores && Object.keys(tScores).length > 0) {
      setIsShowTScoreAnalysisCard(true);
    }else {
      setIsShowTScoreAnalysisCard(false);
    }
  }, [tScores]);

  useEffect(() => {
    if (( total || factors.length > 0) && Object.keys(tScores).length == 0 ) {
      setIsShowTotalAndFactorAnalysisCard(true);
    }else {
      setIsShowTotalAndFactorAnalysisCard(false);
    }
  }, [tScores, total, factors]);

  const initAnalysis = (answerSheetId) => {
    getAnalysis(answerSheetId).then(result => {
      setAnswersheetid(answerSheetId);

      setTotal(
        typeof result.macro_interpretation !== "string"
          ? result.macro_interpretation
          : null
      );
      setFactors(result.factor_interpretations);

      setTScores(result.t_score_interpretations);

      setIsReady(true);
    });
  }

  const haveAnalysis = () => {
    return total !== null || factors.length > 0;
  };

  return (
    <>
      {exportAnalysisFlag && (
        <ExportImageDialog
          total={total}
          factors={factors}
          flag={exportAnalysisFlag}
          onClose={() => {
            setExportAnalysisFlag(false);
          }}
        />
      )}

      <PrivacyAuthorization />

      {!isReady && (
        <AtActivityIndicator mode="center" content='加载中，请稍候...'></AtActivityIndicator>
      )}
      
      {isReady && isShowTScoreAnalysisCard && (
        <TScoreAnalysisShowCard tScores={tScores} />
      )}

      {isReady && isShowTotalAndFactorAnalysisCard && (
        <PageContainer
          header={
            <View
              className="s-row"
              style={{ justifyContent: "flex-end", padding: "32rpx 0rpx" }}
            >
              <View
                className="s-row"
                style={{ width: haveAnalysis() ? "120px" : "120px" }}
              >
                <AtButton
                  size="small"
                  type="primary"
                  onClick={() => {
                    Taro.redirectTo({
                      url: `/pages/answersheet/detail/index?a=${answersheetid}`
                    });
                  }}
                >
                  查看原始答卷
                </AtButton>
                {haveAnalysis() ? (
                  <View style={{ display: "none" }}><AtButton
                    size="small"
                    type="primary"
                    onClick={() => setExportAnalysisFlag(true)}
                  >
                    导出解读报告
                  </AtButton></View>
                ) : null}
              </View>
            </View>
          }
        >
          <View style={{ padding: "30px" }}>
            {total ? (
              <TotalAnalysisShowCard
                content={total.content}
                score={total.score}
              ></TotalAnalysisShowCard>
            ) : null}
            {factors.map(v => {
              return (
                <FactorAnalysisShowCard
                  key={v.factor_code}
                  title={v.title}
                  content={v.content}
                  score={v.score}
                  total={v.max_score}
                ></FactorAnalysisShowCard>
              );
            })}
            {!haveAnalysis() ? (
              <View
                style={{
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "400rpx"
                }}
              >
                暂无解读内容
              </View>
            ) : null}
          </View>
        </PageContainer>
      )}
    </>
  );
};

export default Analysis;
