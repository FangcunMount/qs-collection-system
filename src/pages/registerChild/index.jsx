import React from "react";
import { useReady, useRouter } from "@tarojs/taro";
import { ChildRegister } from "../../components/register";
import { paramsConcat } from "../../util";
import { getLogger } from "../../util/log";

const PAGE_NAME = "registerChild";
const logger = getLogger(PAGE_NAME);

const RegisterChild = () => {
  const paramData = useRouter();
  let { submitClose, goUrl, goParams, testeeId, mode } = paramData.params;
  goParams = goParams ?? "{}";
  goUrl = paramsConcat(goUrl, JSON.parse(goParams));

  useReady(() => {
    logger.RUN("did ready <RUN> | params: ", {
      submitClose,
      goUrl,
      testeeId,
      mode
    });
  });

  return (
    <ChildRegister
      submitClose={submitClose == "1"}
      goUrl={goUrl}
      testeeId={testeeId}
      mode={mode}
    />
  );
};

export default RegisterChild;
