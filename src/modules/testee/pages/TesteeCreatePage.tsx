import React from "react";
import { useReady, useRouter } from "@tarojs/taro";

import { getLogger } from "@/shared/lib/logger";
import { withQuery } from "@/shared/lib/query";
import TesteeRegisterForm from "../components/TesteeRegisterForm";

const logger = getLogger("registerTestee");

const TesteeCreatePage = () => {
  const params = useRouter().params;
  const submitClose = params.submitClose === "1";
  let goUrl = "";
  if (params.goUrl) {
    try {
      goUrl = withQuery(params.goUrl, JSON.parse(params.goParams || "{}") as Record<string, unknown>);
    } catch (error: unknown) {
      logger.WARN("档案注册回跳参数解析失败", error);
      goUrl = params.goUrl;
    }
  }
  useReady(() => logger.RUN("did ready <RUN> | params: ", { submitClose, goUrl }));
  return <TesteeRegisterForm submitClose={submitClose} goUrl={goUrl} />;
};

export default TesteeCreatePage;
