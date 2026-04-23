const normalizeQueryValue = (value) => {
  if (Array.isArray(value)) {
    return value.join(",");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
};

export const buildQueryString = (params = {}) => {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(normalizeQueryValue(value))}`)
    .join("&");

  return query;
};

export const withQuery = (path, params = {}) => {
  const query = buildQueryString(params);
  return query ? `${path}?${query}` : path;
};

export default {
  buildQueryString,
  withQuery,
};
