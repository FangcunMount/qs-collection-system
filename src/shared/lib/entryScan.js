import { routes } from "../config/routes";

export const normalizeMiniProgramPath = (path) => {
  if (!path) return "";
  if (path.startsWith("/")) return path;
  if (path.startsWith("pages/")) return `/${path}`;
  return "";
};

const parseQueryParams = (queryString) => {
  return String(queryString || "")
    .replace(/^\?/, "")
    .split("&")
    .filter(Boolean)
    .reduce((acc, pair) => {
      const [key, value = ""] = pair.split("=");
      if (!key) return acc;
      acc[decodeURIComponent(key)] = decodeURIComponent(value);
      return acc;
    }, {});
};

export const buildAssessmentScanTargetUrl = (scanResult) => {
  const pathFromResult = normalizeMiniProgramPath(scanResult?.path || "");
  if (pathFromResult) {
    return pathFromResult;
  }

  const rawResult = String(scanResult?.result || "").trim();
  if (!rawResult) return "";

  const directPath = normalizeMiniProgramPath(rawResult);
  if (directPath) {
    return directPath;
  }

  if (rawResult.includes("?")) {
    const [pathPart, queryPart] = rawResult.split("?");
    const normalizedPath = normalizeMiniProgramPath(pathPart);
    const query = parseQueryParams(queryPart);
    if (normalizedPath) {
      return queryPart ? `${normalizedPath}?${queryPart}` : normalizedPath;
    }

    if (query.scene) {
      return routes.assessmentFill({ scene: query.scene });
    }

    if (query.token) {
      return routes.assessmentFill({ token: query.token });
    }

    const urlPath = normalizeMiniProgramPath(query.path || "");
    if (urlPath) {
      return urlPath;
    }
  }

  if (/^ae_[A-Za-z0-9_]+$/.test(rawResult)) {
    return routes.assessmentFill({ token: rawResult });
  }

  return "";
};

export const isScanCancelError = (error) => {
  const message = String(error?.errMsg || error?.message || "");
  return message.includes("scanCode:fail cancel");
};

export default {
  normalizeMiniProgramPath,
  buildAssessmentScanTargetUrl,
  isScanCancelError,
};
