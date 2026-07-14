import type { Testee } from "@/store/testeeStore";

export type TesteeBootstrapDecision =
  | { kind: "create_testee" }
  | { kind: "load_selected"; testeeId: string }
  | { kind: "load_single"; testeeId: string }
  | { kind: "await_selection" };

export function resolveTesteeBootstrap(
  testees: Testee[],
  explicitTesteeId?: string,
): TesteeBootstrapDecision {
  if (testees.length === 0) return { kind: "create_testee" };
  if (explicitTesteeId) return { kind: "load_selected", testeeId: explicitTesteeId };
  if (testees.length === 1) return { kind: "load_single", testeeId: testees[0].id };
  return { kind: "await_selection" };
}

export interface ResolveQuestionnaireModeInput {
  questionnaireType?: string;
  questionCount: number;
  requestedSinglePage: boolean;
  isPersonalityFlow: boolean;
}

export function resolveQuestionnaireSinglePageMode({
  questionnaireType,
  questionCount,
  requestedSinglePage,
  isPersonalityFlow,
}: ResolveQuestionnaireModeInput): boolean {
  if (questionnaireType === "PersonalityAssessment" || isPersonalityFlow) return true;
  if (questionnaireType === "MedicalScale" && questionCount < 20) return true;
  return requestedSinglePage;
}
