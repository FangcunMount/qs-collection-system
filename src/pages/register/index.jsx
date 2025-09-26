import React from "react";
import { useReady, useRouter } from "@tarojs/taro";
import FcRegister from "../../components/fcRegister/fcRegister";
import { paramsConcat } from "../../util";
import { getLogger } from "../../util/log";

const PAGE_NAME = "register";
const logger = getLogger(PAGE_NAME);

const Register = () => {
  const paramData = useRouter();
  let { submitClose, goUrl, goParams, role, renderParams } = paramData.params;
  renderParams = renderParams ? JSON.parse(renderParams) : {};
  goUrl = paramsConcat(goUrl, JSON.parse(goParams));

  useReady(() => {
    logger.RUN("did reday <RUN> | params: ", {
      submitClose,
      goUrl,
      role,
      renderParams
    });
  });

  return (
    <FcRegister
      submitClose={submitClose == "1"}
      goUrl={goUrl}
      role={role}
      renderParams={renderParams}
    ></FcRegister>
  );
};

export default Register;
