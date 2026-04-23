export const parsingScene = (scene) => {
  return decodeURIComponent(scene)
    .split("&")
    .reduce((result, pair) => {
      const [key, value] = pair.split("=");
      result[key] = value;
      return result;
    }, {});
};

export default {
  parsingScene,
};
