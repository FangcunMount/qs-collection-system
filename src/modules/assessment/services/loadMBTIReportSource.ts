import { getPersonalityReport } from '@/services/api/personality';
import { getAIExplanationCapability } from '@/services/api/aiExplanationApi';
import type { AIScope } from '@/services/api/aiExplanationApi';
import type { MBTIReferenceSelection } from '@/services/api/mbtiReferences';
import type { RequestLifetime } from '@/services/requestLifetime';
import { buildPersonalityReportViewModel } from '../viewModels/personalityReport';
import type { PersonalityReportViewModel } from '../types';

const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

// The standard-report DTO has no report ID. Recheck the authoritative source
// after reading it, rather than presenting an updated report as the old AI facts.
export async function loadMBTIReportSource(scope: AIScope, reportId: string,
  references: MBTIReferenceSelection | undefined, lifetime: RequestLifetime): Promise<PersonalityReportViewModel | null> {
  if (!lifetime.isActive()) return null;
  const raw: unknown = await getPersonalityReport({ ...scope, lifetime });
  if (!lifetime.isActive()) return null;
  const source = await getAIExplanationCapability(scope, lifetime);
  if (!lifetime.isActive() || source.source_report_id !== reportId || source.source_state !== 'current' ||
      !object(raw) || String(raw.assessment_id || '') !== scope.assessmentId ||
      (raw.testee_id !== undefined && String(raw.testee_id) !== scope.testeeId)) return null;
  const report = buildPersonalityReportViewModel(raw, { id: scope.testeeId });
  if (!/^MBTI(?:_|$)/.test(report.modelCode)) return null;
  if (references && (report.modelCode !== references.model_code || report.outcome.code !== references.type_code ||
      !object(raw.model) || raw.model.version !== references.model_version)) return null;
  return report;
}
