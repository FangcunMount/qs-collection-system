import React from 'react';
import renderer, { act } from 'react-test-renderer';
import Taro from '@tarojs/taro';
import AssessmentRecordListController from '../AssessmentRecordListController';
import { routes } from '@/shared/config/routes';
import { loadMedicalAssessmentRecords } from '../../../services/loadMedicalAssessmentRecords';
import { loadPersonalityAssessmentRecords } from '../../../services/personalityAssessmentRecordService';
import { loadBehaviorAssessmentRecords } from '../../../services/behaviorAssessmentRecordService';

jest.mock('../../../services/loadMedicalAssessmentRecords', () => ({ loadMedicalAssessmentRecords: jest.fn() }));
jest.mock('../../../services/personalityAssessmentRecordService', () => ({ loadPersonalityAssessmentRecords: jest.fn() }));
jest.mock('../../../services/behaviorAssessmentRecordService', () => ({ loadBehaviorAssessmentRecords: jest.fn() }));

beforeEach(() => {
  const empty = { items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 };
  [loadMedicalAssessmentRecords, loadPersonalityAssessmentRecords, loadBehaviorAssessmentRecords]
    .forEach(load => load.mockResolvedValue(empty));
});

test.each([
  ['medical', routes.tabScales()],
  ['personality', routes.personalityCatalog()],
  ['ability', routes.abilityCatalog()],
])('empty %s records lead directly to the matching catalog', async (kind, url) => {
  const navigate = jest.spyOn(Taro, 'navigateTo').mockResolvedValue({});
  let tree;
  try {
    await act(async () => {
      tree = renderer.create(<AssessmentRecordListController
        testee={{ id: 'member-1', name: '成员' }} assessmentKind={kind} showFilterBar={false}
      />);
    });
    const buttons = tree.root.findAllByType('taro-button');
    expect(buttons).toHaveLength(1);
    expect(JSON.stringify(tree.toJSON())).toContain('去测评');
    await act(async () => { await buttons[0].props.onClick(); });
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith({ url });
  } finally {
    if (tree) act(() => tree.unmount());
    navigate.mockRestore();
  }
});
