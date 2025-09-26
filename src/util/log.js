import Taro from "@tarojs/taro";

const { miniProgram: { version } } = Taro.getAccountInfoSync();
const VERSION = version ?? "0.0.0";


const canIUseLogManage = Taro.canIUse("getLogManager");
const logger = canIUseLogManage ? Taro.getLogManager({ level: 0 }) : null;
const realtimeLogger = Taro.getRealtimeLogManager ? Taro.getRealtimeLogManager() : null;

export function RUN(file, ...args) {
  console.log(`[${VERSION}]`, file, " | ", ...args);
  if (canIUseLogManage) {
    logger.log(`[${VERSION}]`, file, " | ", ...args);
  }

  realtimeLogger && realtimeLogger.info(`[${VERSION}]`, file, " | ", ...args);
}

export function WARN(file, ...args) {
  console.warn(`[${VERSION}]`, file, " | ", ...args);
  if (canIUseLogManage) {
    logger.warn(`[${VERSION}]`, file, " | ", ...args);
  }

  realtimeLogger && realtimeLogger.warn(`[${VERSION}]`, file, " | ", ...args);
}

export function ERROR(file, ...args) {
  console.error(`[${VERSION}]`, file, " | ", ...args);
  if (canIUseLogManage) {
    logger.debug(`[${VERSION}]`, file, " | ", ...args);
  }

  realtimeLogger && realtimeLogger.error(`[${VERSION}]`, file, " | ", ...args);
}



export function getLogger(fileName) {
  return {
    ERROR: function (...args) {
      ERROR(fileName, ...args)
    },
    RUN: function (...args) {
      RUN(fileName, ...args)
    },
    WARN: function (...args) {
      WARN(fileName, ...args)
    }
  }
}