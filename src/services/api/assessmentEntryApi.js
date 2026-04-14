import config from "../../config";
import { request } from "../servers";

export function resolveAssessmentEntry(token) {
  return request(
    `/public/assessment-entries/${encodeURIComponent(token)}`,
    {},
    { host: config.qsHost, needToken: false }
  );
}

export default {
  resolveAssessmentEntry
};
