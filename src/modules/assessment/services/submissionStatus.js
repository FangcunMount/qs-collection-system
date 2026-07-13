export class SubmissionContractViolation extends Error {
  constructor(message, data = {}) {
    super(message);
    this.name = 'SubmissionContractViolation';
    this.code = 'SUBMISSION_CONTRACT_VIOLATION';
    this.data = data;
  }
}

export function assertSubmitStatusReady(statusResult = {}, requestId = '') {
  const status = String(statusResult.status || '').toLowerCase();
  if (status !== 'done') {
    throw new SubmissionContractViolation('submit-status 尚未完成', { requestId, statusResult });
  }
  const answersheetId = statusResult.answersheet_id ? String(statusResult.answersheet_id) : '';
  const assessmentId = statusResult.assessment_id ? String(statusResult.assessment_id) : '';
  if (!answersheetId || !assessmentId) {
    throw new SubmissionContractViolation(
      'submit-status=done 但缺少 answersheet_id 或 assessment_id',
      { requestId: String(requestId || statusResult.request_id || ''), statusResult }
    );
  }
  return {
    ...statusResult,
    status: 'done',
    answersheet_id: answersheetId,
    assessment_id: assessmentId,
    request_id: String(statusResult.request_id || requestId || ''),
  };
}
