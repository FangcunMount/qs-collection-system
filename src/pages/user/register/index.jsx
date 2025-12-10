import React from "react";
import { useReady, useRouter } from "@tarojs/taro";
import { UserRegister } from "../../../components/register";
import { paramsConcat } from "../../../util";
import { getLogger } from "../../../util/log";

const PAGE_NAME = "register";
const logger = getLogger(PAGE_NAME);

const Register = () => {
  const paramData = useRouter();
  let { submitClose, goUrl, goParams } = paramData.params;
  goParams = goParams ?? "{}";
  goUrl = paramsConcat(goUrl, JSON.parse(goParams));

  useReady(() => {
    logger.RUN("did reday <RUN> | params: ", {
      submitClose,
      goUrl
    });
  });

  return (
    <UserRegister
      submitClose={submitClose == "1"}
      goUrl={goUrl}
    />
  );
};

export default Register;
