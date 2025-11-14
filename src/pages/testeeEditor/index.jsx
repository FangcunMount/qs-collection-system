import React from "react";
import Taro, { useRouter } from "@tarojs/taro";
import TesteeEditor from "../../components/testeeEditor/index.jsx";

const TesteeEditorPage = () => {
  const router = useRouter();
  const { testeeId } = router.params;

  const handleSuccess = () => {
    // 保存成功后返回上一页
    Taro.navigateBack();
  };

  const handleCancel = () => {
    // 取消编辑返回上一页
    Taro.navigateBack();
  };

  return (
    <TesteeEditor
      testeeId={testeeId}
      onSuccess={handleSuccess}
      onCancel={handleCancel}
    />
  );
};

export default TesteeEditorPage;
