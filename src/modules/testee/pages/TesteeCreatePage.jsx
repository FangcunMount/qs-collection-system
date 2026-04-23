import React from "react";
import { useReady, useRouter } from "@tarojs/taro";
import TesteeRegisterForm from "../components/TesteeRegisterForm";
import { withQuery } from "@/shared/lib/query";
import { getLogger } from "@/shared/lib/logger";

const PAGE_NAME = "registerChild";
const logger = getLogger(PAGE_NAME);

const RegisterChild = () => {
  const paramData = useRouter();
  let { submitClose, goUrl, goParams } = paramData.params;
  goParams = goParams ?? "{}";
  goUrl = goUrl ? withQuery(goUrl, JSON.parse(goParams)) : "";

  useReady(() => {
    logger.RUN("did ready <RUN> | params: ", {
      submitClose,
      goUrl
    });
  });

  return (
    <TesteeRegisterForm
      submitClose={submitClose == "1"}
      goUrl={goUrl}
    />
  );
};

export default RegisterChild;
