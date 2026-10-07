import { useEffect, useRef, useState } from 'react';
import type { AIOutput, AIScope } from '@/services/api/aiExplanationApi';
import { createRequestLifetime } from '@/services/requestLifetime';
import { getSessionRevision, onSessionCleared } from '@/shared/stores/sessionPrivacy';
import { loadMBTIReportSource } from '../services/loadMBTIReportSource';
import type { PersonalityReportViewModel } from '../types';

export function useMBTIReportSource(scope: AIScope, output: AIOutput | undefined, enabled: boolean) {
  const [session, setSession] = useState(getSessionRevision);
  const [loaded, setLoaded] = useState<{ key: string; report: PersonalityReportViewModel | null }>({ key: '', report: null });
  const reportId = output?.source_report_id || '';
  const references = output?.reference_material;
  const outputRef = useRef(output);
  outputRef.current = output;
  const blockedOutput = useRef<AIOutput | undefined>(undefined);
  const active = enabled && output !== blockedOutput.current && output?.source_state === 'current' && !!reportId && !!scope.assessmentId && !!scope.testeeId;
  const key = [scope.assessmentId, scope.testeeId, reportId, session, output?.artifact_id || ''].join('|');
  useEffect(() => onSessionCleared(() => {
    blockedOutput.current = outputRef.current;
    setLoaded({ key: '', report: null });
    setSession(getSessionRevision());
  }), []);
  useEffect(() => {
    if (!active) { setLoaded({ key: '', report: null }); return; }
    setLoaded({ key: '', report: null });
    const lifetime = createRequestLifetime(() => getSessionRevision() === session);
    void loadMBTIReportSource(scope, reportId, references, lifetime).then(report => {
      if (lifetime.isActive()) setLoaded({ key, report });
    }).catch(() => {
      if (lifetime.isActive()) setLoaded({ key, report: null });
    });
    return () => lifetime.cancel();
  }, [active, key, reportId, scope.assessmentId, scope.testeeId, session, references]);
  // Never expose a previous account, request or report while a new one loads.
  return { report: active && loaded.key === key ? loaded.report : null,
    loading: active && loaded.key !== key };
}
