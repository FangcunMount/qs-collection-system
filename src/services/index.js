import authApi from "./api/authApi";
import questionsheetApi from "./api/questionsheetApi";
import answersheetApi from "./api/answersheetApi";
import analysisApi from "./api/analysisApi";
import userApi from "./api/user";

export default {
  ...authApi,
  ...questionsheetApi,
  ...answersheetApi,
  ...analysisApi,
  ...userApi
};
