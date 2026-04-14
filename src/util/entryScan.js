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
    const scene = query.scene;
    if (scene) {
      return `/pages/questionnaire/fill/index?scene=${encodeURIComponent(scene)}`;
    }
    const token = query.token;
    if (token) {
      return `/pages/questionnaire/fill/index?token=${encodeURIComponent(token)}`;
    }
    const queryPath = query.path;
    const urlPath = normalizeMiniProgramPath(queryPath || "");
    if (urlPath) {
      return urlPath;
    }
  }

  if (/^ae_[A-Za-z0-9_]+$/.test(rawResult)) {
    return `/pages/questionnaire/fill/index?token=${encodeURIComponent(rawResult)}`;
  }

  return "";
};

export const isScanCancelError = (error) => {
  const message = String(error?.errMsg || error?.message || "");
  return message.includes("scanCode:fail cancel");
};
