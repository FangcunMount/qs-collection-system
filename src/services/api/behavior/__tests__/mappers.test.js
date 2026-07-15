import {
  extractBehaviorAssessmentList,
  mapBehaviorReportPayload,
  normalizeBehaviorAssessmentRecord,
  normalizeBehaviorReportStatus,
} from '../mappers';

describe('behavior assessment API mappers', () => {
  test('maps a behavioral_rating list item to the ability record domain', () => {
    const source = {
      id: 42,
      answer_sheet_id: 84,
      status: 'interpreted',
      model: { code: 'SDQ_PARENT', title: '长处和困难问卷', kind: 'behavioral_rating' },
      primary_score: { value: 18 },
      level: { code: 'attention' },
    };

    expect(extractBehaviorAssessmentList({ data: { items: [source] } })).toEqual([source]);
    expect(normalizeBehaviorAssessmentRecord(source)).toMatchObject({
      id: '42',
      answer_sheet_id: '84',
      title: '长处和困难问卷',
      description: 'SDQ_PARENT',
      score: 18,
      risk_level: 'attention',
      assessment_kind: 'ability',
      kind: 'ability',
    });
  });

  test('adapts the behavior report without discarding the dedicated payload', () => {
    const report = mapBehaviorReportPayload({
      data: {
        assessment_id: '42',
        model: { code: 'EFN_CHILD', title: '执行功能测评' },
        primary_score: { value: 23 },
        level: { code: 'normal' },
        dimensions: [{
          factor_code: 'inhibit',
          raw_score: 6,
          derived_scores: [{ kind: 't_score', value: 65 }],
          level: { code: 'elevated', label: '偏高' },
          norm_reference: { score_kind: 't_score', benchmark: 50, table_version: '2026' },
        }],
        suggestions: [{ category: 'practice', content: '继续练习' }],
      },
    });

    expect(report.data).toMatchObject({
      assessment_id: '42',
      scale_name: '执行功能测评',
      scale_code: 'EFN_CHILD',
      total_score: 23,
      risk_level: 'normal',
    });
    expect(report.data.dimensions).toHaveLength(1);
    expect(report.data.dimensions[0]).toMatchObject({
      derived_scores: [{ kind: 't_score', value: 65 }],
      level: { code: 'elevated', label: '偏高' },
      norm_reference: { score_kind: 't_score', benchmark: 50, table_version: '2026' },
    });
    expect(report.data.suggestions).toHaveLength(1);
  });

  test('normalizes behavior report polling hints', () => {
    expect(normalizeBehaviorReportStatus({
      data: { status: 'PROCESSING', stage: 'scoring', next_poll_after_ms: 1500 },
    })).toMatchObject({
      status: 'processing',
      stage: 'scoring',
      nextPollAfterMs: 1500,
    });
  });
});
