import { withQuery } from "../lib/query";

export const ROUTES = Object.freeze({
  tabHome: "/pages/tab/home/index",
  tabScales: "/pages/tab/scales/index",
  tabMe: "/pages/tab/me/index",
  assessmentFill: "/pages/assessment/fill/index",
  assessmentRecords: "/pages/assessment/records/index",
  assessmentResponse: "/pages/assessment/response/index",
  assessmentReport: "/pages/assessment/report/index",
  assessmentReportTrend: "/pages/assessment/report-trend/index",
  assessmentReportPending: "/pages/assessment/report-pending/index",
  accountRegister: "/pages/account/register/index",
  accountSubscription: "/pages/account/subscription/index",
  testeeList: "/pages/testees/list/index",
  testeeCreate: "/pages/testees/create/index",
  testeeEdit: "/pages/testees/edit/index",
  systemError: "/pages/system/error/index",
});

export const routes = Object.freeze({
  tabHome: (params) => withQuery(ROUTES.tabHome, params),
  tabScales: (params) => withQuery(ROUTES.tabScales, params),
  tabMe: (params) => withQuery(ROUTES.tabMe, params),
  assessmentFill: (params) => withQuery(ROUTES.assessmentFill, params),
  assessmentRecords: (params) => withQuery(ROUTES.assessmentRecords, params),
  assessmentResponse: (params) => withQuery(ROUTES.assessmentResponse, params),
  assessmentReport: (params) => withQuery(ROUTES.assessmentReport, params),
  assessmentReportTrend: (params) => withQuery(ROUTES.assessmentReportTrend, params),
  assessmentReportPending: (params) => withQuery(ROUTES.assessmentReportPending, params),
  accountRegister: (params) => withQuery(ROUTES.accountRegister, params),
  accountSubscription: (params) => withQuery(ROUTES.accountSubscription, params),
  testeeList: (params) => withQuery(ROUTES.testeeList, params),
  testeeCreate: (params) => withQuery(ROUTES.testeeCreate, params),
  testeeEdit: (params) => withQuery(ROUTES.testeeEdit, params),
  systemError: (params) => withQuery(ROUTES.systemError, params),
});

export const buildRoute = withQuery;

export default routes;
