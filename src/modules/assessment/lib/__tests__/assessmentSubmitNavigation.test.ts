import { buildPostSubmitRedirectUrl } from "../assessmentSubmitNavigation";

test.each(["medical", "personality", "ability"])("%s submission keeps the member in its contract after global selection changes", (assessmentKind) => {
  const url = buildPostSubmitRedirectUrl({ assessmentKind, answersheetId: "answer-1", assessmentId: "assessment-1", requestId: "request-1",
    testeeId: "new-global-member", submitContract: { testee_id: "submitted-member" }, planTaskId: "task-1" });
  expect(url).toContain("t=submitted-member");
  expect(url).not.toContain("new-global-member");
  expect(url).toContain("a=answer-1");
  expect(url).toContain("request_id=request-1");
  expect(url).toContain("task_id=task-1");
});

test("legacy callers retain their explicit member and survey navigation remains unchanged", () => {
  expect(buildPostSubmitRedirectUrl({ assessmentKind: "medical", answersheetId: "answer", testeeId: "legacy-member" })).toContain("t=legacy-member");
  expect(buildPostSubmitRedirectUrl({ questionnaireType: "Survey", answersheetId: "answer", submitContract: { testee_id: "member" } })).toContain("/response/index?a=answer");
});
