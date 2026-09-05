import { normalizePersonalityReport } from "../services/personalityReportMapper";

import type { PersonalityReportViewModel } from "../types";

type FallbackTestee = { id?: string; legalName?: string; name?: string } | null;

export const buildPersonalityReportViewModel = (
  raw: unknown,
  fallbackTestee?: FallbackTestee,
): PersonalityReportViewModel => {
  const normalized = normalizePersonalityReport(raw) as Omit<PersonalityReportViewModel, "tone">;
  const matchingTestee = !normalized.testeeId || String(normalized.testeeId) === String(fallbackTestee?.id)
    ? fallbackTestee : null;
  return {
    ...normalized,
    tone: "personality",
    testeeName: normalized.testeeName
      || matchingTestee?.legalName
      || matchingTestee?.name
      || "",
    testeeId: normalized.testeeId || String(fallbackTestee?.id || ""),
  };
};
