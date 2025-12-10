/**
 * 入口参数处理 Hook
 * 统一处理小程序入口参数、场景值等
 */
import { useState, useEffect } from "react";
import { useRouter } from "@tarojs/taro";
import { parsingScene } from "../../../util";
import { getMpEntryParams } from "../../../services/api/commonApi";

export const useEntryParams = () => {
  const router = useRouter();
  const [params, setParams] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    handleEntryParams(router.params);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEntryParams = async (rawParams) => {
    try {
      setLoading(true);
      setError(null);

      // 如果没有 scene 参数，直接返回
      if (!rawParams.scene) {
        setParams(rawParams);
        return;
      }

      // 解析 scene 参数
      const parsedParams = parsingScene(rawParams.scene);

      // 如果没有 mpqrcodeid，直接返回解析后的参数
      if (!parsedParams.mpqrcodeid) {
        setParams(parsedParams);
        return;
      }

      // 通过 mpqrcodeid 获取完整的入口参数
      const result = await getMpEntryParams(parsedParams.mpqrcodeid);
      setParams(result.entry_data);
    } catch (err) {
      setError(err);
      console.error("[useEntryParams] 参数处理失败:", err);
      setParams(rawParams);
    } finally {
      setLoading(false);
    }
  };

  return { params, loading, error, refresh: () => handleEntryParams(router.params) };
};
