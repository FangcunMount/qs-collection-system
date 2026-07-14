import { normalizePersonalityReport } from "../services/personalityReportMapper";

import type { PersonalityReportViewModel } from "../types";

type FallbackTestee = { id?: string; legalName?: string; name?: string } | null;

export const buildPersonalityReportViewModel = (
  raw: unknown,
  fallbackTestee?: FallbackTestee,
): PersonalityReportViewModel => {
  const normalized = normalizePersonalityReport(raw) as Omit<PersonalityReportViewModel, "tone">;
  return {
    ...normalized,
    tone: "personality",
    testeeName: normalized.testeeName
      || fallbackTestee?.legalName
      || fallbackTestee?.name
      || "",
    testeeId: normalized.testeeId || String(fallbackTestee?.id || ""),
  };
};
