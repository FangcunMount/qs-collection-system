import { waitForAssessmentReadiness } from '@/services/api/answersheetApi';
import { waitForReportReady } from '../waitForReportReady';
import { waitAssessmentReportLifecycle } from '../waitAssessmentReportLifecycle';

jest.mock('@/services/api/answersheetApi', () => ({
  waitForAssessmentReadiness: jest.fn(),
}));
jest.mock('../waitForReportReady', () => ({
  waitForReportReady: jest.fn(),
}));

const strategy = {
  isCompleted: status => status === 'completed',
  isFailed: status => status === 'failed',
};

const baseInput = {
  strategy,
  assessmentKind: 'medical',
  assessmentId: '',
  answerSheetId: '42',
  requestId: 'request-1',
  testeeId: '7',
  shouldContinue: () => true,
};

describe('assessment readiness lifecycle terminal routing', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns no_assessment_required without entering report wait', async () => {
    waitForAssessmentReadiness.mockResolvedValue({
      status: 'no_assessment_required',
      answersheet_id: '42',
    });
    const onSubmissionReady = jest.fn();

    await expect(waitAssessmentReportLifecycle({
      ...baseInput,
      onSubmissionReady,
    })).resolves.toEqual({
      source: 'assessment-readiness',
      statusData: {
        status: 'no_assessment_required',
        answersheet_id: '42',
        stage: 'no_assessment_required',
        message: '答卷已提交，无需生成测评报告',
      },
      answerSheetId: '42',
      requestId: 'request-1',
    });
    expect(onSubmissionReady).not.toHaveBeenCalled();
    expect(waitForReportReady).not.toHaveBeenCalled();
  });

  test('returns explicit assessment failure without entering report wait', async () => {
    waitForAssessmentReadiness.mockResolvedValue({
      status: 'failed',
      answersheet_id: '42',
      reason: 'model validation failed',
    });

    const result = await waitAssessmentReportLifecycle(baseInput);

    expect(result).toMatchObject({
      source: 'assessment-readiness',
      failed: true,
      answerSheetId: '42',
      statusData: {
        status: 'failed',
        stage: 'assessment_failed',
        reason: 'model validation failed',
        message: 'model validation failed',
      },
    });
    expect(result.assessmentId).toBeUndefined();
    expect(waitForReportReady).not.toHaveBeenCalled();
  });

  test('ready preserves the existing report wait path and real assessment id', async () => {
    waitForAssessmentReadiness.mockResolvedValue({
      status: 'ready',
      answersheet_id: '42',
      assessment_id: '99',
    });
    waitForReportReady.mockResolvedValue({
      source: 'report-status',
      statusData: { status: 'completed' },
    });
    const onSubmissionReady = jest.fn();

    await expect(waitAssessmentReportLifecycle({
      ...baseInput,
      onSubmissionReady,
    })).resolves.toMatchObject({
      source: 'report-status',
      assessmentId: '99',
      answerSheetId: '42',
    });
    expect(onSubmissionReady).toHaveBeenCalledWith({
      requestId: 'request-1',
      answersheetId: '42',
      assessmentId: '99',
    });
    expect(waitForReportReady).toHaveBeenCalledWith(expect.objectContaining({
      assessmentId: '99',
      testeeId: '7',
    }));
  });
});
