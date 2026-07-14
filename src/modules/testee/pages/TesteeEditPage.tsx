import React from "react";
import Taro, { useRouter } from "@tarojs/taro";

import TesteeEditor from "../components/TesteeEditor";

const TesteeEditPage = () => {
  const { testeeId = "" } = useRouter().params;
  return <TesteeEditor testeeId={testeeId} onSuccess={() => Taro.navigateBack()} onCancel={() => Taro.navigateBack()} />;
};

export default TesteeEditPage;
