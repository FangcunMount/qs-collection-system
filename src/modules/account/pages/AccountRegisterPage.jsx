import React from "react";
import { useReady, useRouter } from "@tarojs/taro";
import UserRegisterForm from "../components/UserRegisterForm";
import { withQuery } from "@/shared/lib/query";
import { getLogger } from "@/shared/lib/logger";

const PAGE_NAME = "register";
const logger = getLogger(PAGE_NAME);

const Register = () => {
  const paramData = useRouter();
  let { submitClose, goUrl, goParams } = paramData.params;
  goParams = goParams ?? "{}";
  goUrl = goUrl ? withQuery(goUrl, JSON.parse(goParams)) : "";

  useReady(() => {
    logger.RUN("did reday <RUN> | params: ", {
      submitClose,
      goUrl
    });
  });

  return (
    <UserRegisterForm
      submitClose={submitClose == "1"}
      goUrl={goUrl}
    />
  );
};

export default Register;
