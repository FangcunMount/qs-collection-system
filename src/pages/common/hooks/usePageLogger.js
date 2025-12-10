/**
 * 页面日志 Hook
 * 统一页面日志记录
 */
import { useEffect, useRef } from "react";
import { getLogger } from "../../../util/log";

export const usePageLogger = (pageName) => {
  const logger = useRef(getLogger(pageName));

  useEffect(() => {
    logger.current.info(`[${pageName}] 页面加载`);

    return () => {
      logger.current.info(`[${pageName}] 页面卸载`);
    };
  }, [pageName]);

  return logger.current;
};
