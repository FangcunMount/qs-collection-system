/* eslint-env node */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { transformSync } = require('@babel/core');

const root = path.resolve(__dirname, '..');
const dependencyStubs = {
  '../servers': { request: () => Promise.resolve({}) },
  '../../config': {},
	'./answersheetApi': { waitForAssessmentReadiness: async () => ({}) },
  '@/shared/config/collectionApiCapabilities': {},
};

const loadModule = (relativePath) => {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  const compiled = transformSync(source, {
    filename: relativePath,
    babelrc: false,
    configFile: false,
    plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  const evaluatedModule = { exports: {} };
  new Function('require', 'module', 'exports', compiled)(
    (request) => dependencyStubs[request] || require(request),
    evaluatedModule,
    evaluatedModule.exports,
  );
  return evaluatedModule.exports;
};

const { mapMedicalReportPayload } = loadModule('src/services/api/assessmentApi.js');
assert.strictEqual(typeof mapMedicalReportPayload, 'function', 'medical report mapper must be exported');

const mapped = mapMedicalReportPayload({
  data: {
    assessment_id: '42',
    model: { code: '3adyDE', title: 'SNAP-IV量表' },
    primary_score: { value: 31 },
    level: { code: 'none' },
    conclusion: '整体表现正常',
    dimensions: [{
      factor_code: 'attention',
      factor_name: '注意缺陷（症状数）',
      raw_score: 6,
      description: '注意力表现正常',
      suggestion: '保持规律作息',
    }],
    suggestions: [{ category: '日常建议', content: '保持规律作息' }],
  },
});

assert.strictEqual(mapped.data.total_score, 31, 'must read total score from primary_score.value');
assert.strictEqual(mapped.data.scale_name, 'SNAP-IV量表', 'must use report model title');
assert.strictEqual(mapped.data.scale_code, '3adyDE', 'must use report model code');
assert.strictEqual(mapped.data.risk_level, 'none', 'must use report level code');
assert.strictEqual(mapped.data.dimensions[0].description, '注意力表现正常', 'must preserve dimension interpretation');
assert.strictEqual(mapped.data.dimensions[0].suggestion, '保持规律作息', 'must preserve dimension suggestion');
assert.strictEqual(mapped.data.suggestions[0].content, '保持规律作息', 'must preserve report suggestions');

const { normalizeMedicalAssessmentRecord } = loadModule('src/modules/assessment/services/medicalAssessmentRecordMapper.js');
const record = normalizeMedicalAssessmentRecord({
  id: '42',
  answer_sheet_id: '100',
  status: 'evaluated',
  model: { code: '3adyDE', title: 'SNAP-IV量表' },
  primary_score: { value: 31 },
  level: { code: 'none' },
});
assert.strictEqual(record.title, 'SNAP-IV量表', 'record title must use model title');
assert.strictEqual(record.description, '3adyDE', 'record subtitle must use model code');
assert.strictEqual(record.score, 31, 'record score must use primary_score.value');
assert.strictEqual(record.risk_level, 'none', 'record risk must use level code');

const { isReportReadable } = loadModule('src/modules/assessment/lib/reportReadiness.js');
assert.strictEqual(isReportReadable('evaluated'), true, 'evaluated list items must expose report actions');

console.log('[medical-report-mapper] ok');
