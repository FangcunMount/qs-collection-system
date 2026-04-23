import config from "../../config";

export const getUrl = (url, host) => {
  let baseUrl = "";

  if (host) {
    baseUrl = `${host}${url}`;
  } else if (url.startsWith("/common")) {
    baseUrl = `https://api.${config.domain}${url.replace(new RegExp("/common"), "")}`;
  } else if (url.startsWith("/user") || url.startsWith("/auth")) {
    baseUrl = `${config.iamHost}${url}`;
  } else {
    baseUrl = `${config.collectionHost}${url}`;
  }

  const separator = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separator}display=json`;
};

export default {
  getUrl,
};
