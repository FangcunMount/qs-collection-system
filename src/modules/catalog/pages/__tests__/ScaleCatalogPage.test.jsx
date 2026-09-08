import React from 'react';
import renderer, { act } from 'react-test-renderer';
import Taro from '@tarojs/taro';
import ScaleCatalogPage from '../ScaleCatalogPage';
import SearchBox from '@/shared/ui/SearchBox';
import SurfaceCard from '@/shared/ui/SurfaceCard';
import { routes } from '@/shared/config/routes';
import { listHotPublishedAssessmentModels } from '@/services/api/assessmentModelCatalogApi';

jest.mock('@/services/api/assessmentModelCatalogApi', () => ({ listHotPublishedAssessmentModels: jest.fn() }));
let tree;
beforeEach(() => {
  jest.spyOn(Taro, "navigateTo");
  jest.spyOn(console, "log").mockImplementation(() => {});
  listHotPublishedAssessmentModels.mockResolvedValue({ data: { models: [] } });
});
afterEach(() => { if (tree) act(() => tree.unmount()); tree = undefined; jest.restoreAllMocks(); });

test('home search forwards the keyword and category cards preserve the backend category values', async () => {
  await act(async () => { tree = renderer.create(<ScaleCatalogPage />); });
  act(() => tree.root.findByType(SearchBox).props.onInput({ detail: { value: '  睡眠质量  ' } }));
  act(() => tree.root.findByType(SearchBox).props.onConfirm());
  expect(Taro.navigateTo).toHaveBeenLastCalledWith({ url: routes.scaleList({ keyword: '睡眠质量' }) });
  const sleep = tree.root.findAllByType(SurfaceCard).find(card => card.props.className.includes('--sleep'));
  act(() => sleep.props.onClick());
  expect(Taro.navigateTo).toHaveBeenLastCalledWith({ url: routes.scaleList({ category: 'slp' }) });
});

test('medical cards retain the questionnaire entry and disable unavailable rows', async () => {
  listHotPublishedAssessmentModels.mockResolvedValue({ data: { models: [
    { code: 'available', title: '可用量表', category: 'emt', status: 'published' },
    { code: 'draft', title: '草稿量表', category: 'emt', status: 'draft' },
    { code: 'personality', title: '人格量表', category: 'personality', status: 'published' },
  ] } });
  await act(async () => { tree = renderer.create(<ScaleCatalogPage />); });
  const cards = tree.root.findAllByType(SurfaceCard).filter(card => card.props.className === 'scale-hot-row');
  expect(cards).toHaveLength(2);
  act(() => cards[0].props.onClick());
  expect(Taro.navigateTo).toHaveBeenLastCalledWith({ url: routes.assessmentFill({ q: 'available' }) });
  expect(cards[1].props.onClick).toBeUndefined();
});
