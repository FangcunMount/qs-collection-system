import React from "react";
import { useReady, useRouter } from "@tarojs/taro";

import { getLogger } from "@/shared/lib/logger";
import { withQuery } from "@/shared/lib/query";
import UserRegisterForm from "../components/UserRegisterForm";

const logger = getLogger("register");

const AccountRegisterPage = () => {
  const params = useRouter().params;
  const submitClose = params.submitClose === "1";
  const goParams = params.goParams || "{}";
  let goUrl = "";
  if (params.goUrl) {
    try {
      goUrl = withQuery(params.goUrl, JSON.parse(goParams) as Record<string, unknown>);
    } catch (error: unknown) {
      logger.WARN("注册回跳参数解析失败", error);
      goUrl = params.goUrl;
    }
  }

  useReady(() => logger.RUN("did ready <RUN> | params: ", { submitClose, goUrl }));
  return <UserRegisterForm submitClose={submitClose} goUrl={goUrl} />;
};

export default AccountRegisterPage;
