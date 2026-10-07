import React from 'react';
import renderer, { act } from 'react-test-renderer';
import Taro from '@tarojs/taro';
import Page from '@/modules/assessment/pages/AssessmentResponsePage';
import StatePanel from '@/shared/ui/StatePanel';
import { clearPrivateSessionState } from '@/shared/stores/sessionPrivacy';
import { getAssessmentResponse } from '@/services/api/assessmentResponses';
import { getQuestionnaire } from '@/services/api/questionnaires';
jest.mock('@/services/api/assessmentResponses', () => ({ getAssessmentResponse: jest.fn() }));
jest.mock('@/services/api/questionnaires', () => ({ getQuestionnaire: jest.fn() }));
jest.mock('@/shared/lib/logger', () => ({getLogger: () => ({RUN: jest.fn(), ERROR: jest.fn()})}));
jest.mock('@/shared/stores/assessmentEntry', () => ({getAssessmentEntryContext: () => null}));
jest.mock('@/shared/ui/PageShell', () => ({ __esModule: true, default: ({children}) => children }));
jest.mock('@/shared/ui/PrivacyAuthorization', () => ({PrivacyAuthorization: () => null}));

jest.mock('@/shared/ui/ActionButton', () => ({__esModule:true, default:()=>null}));
jest.mock('@/shared/ui/BottomActionBar', () => ({__esModule:true, default:()=>null}));
jest.mock('@/shared/ui/PlanSubscribeConfirm', () => ({__esModule:true, default:()=>null}));
jest.mock('@/shared/ui/NeedDialog', () => ({__esModule:true, default:()=>null}));
jest.mock('@/modules/questionnaire/components/questions/section', () => ({__esModule:true, default:({item})=>require('react').createElement('answer', item)}));
jest.mock('@/modules/questionnaire/components/questions/radio', () => ({__esModule:true, default:({item})=>require('react').createElement('answer', item)}));
jest.mock('@/modules/questionnaire/components/questions/checkbox', () => ({__esModule:true, default:({item})=>require('react').createElement('answer', item)}));
jest.mock('@/modules/questionnaire/components/questions/text', () => ({__esModule:true, default:({item})=>require('react').createElement('answer', item)}));
jest.mock('@/modules/questionnaire/components/questions/number', () => ({__esModule:true, default:({item})=>require('react').createElement('answer', item)}));
jest.mock('@/modules/questionnaire/components/questions/textarea', () => ({__esModule:true, default:({item})=>require('react').createElement('answer', item)}));
jest.mock('@/modules/questionnaire/components/questions/date', () => ({__esModule:true, default:({item})=>require('react').createElement('answer', item)}));
jest.mock('@/modules/questionnaire/components/questions/scoreRadio', () => ({__esModule:true, default:({item})=>require('react').createElement('answer', item)}));
jest.mock('@/modules/questionnaire/components/questions/select', () => ({__esModule:true, default:({item})=>require('react').createElement('answer', item)}));
jest.mock('@/modules/questionnaire/components/questions/imageRadio', () => ({__esModule:true, default:({item})=>require('react').createElement('answer', item)}));
jest.mock('@/modules/questionnaire/components/questions/imageCheckBox', () => ({__esModule:true, default:({item})=>require('react').createElement('answer', item)}));
jest.mock('@/modules/assessment/components/response/exportImageDialog', () => ({__esModule:true, default:()=>null}));


let tree;
let params, mockOnHide, mockOnShow;
jest.mock('@tarojs/taro', () => {
 const taro=jest.requireActual('@tarojs/taro');
 return {...taro, __esModule:true, default:taro, useDidHide:fn=>{mockOnHide=fn;}, useDidShow:fn=>{mockOnShow=fn;}};
});
const deferred=()=>{let resolve,reject; const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const sheet=(id='old-sheet')=>({id,questionnaire_code:'Q',questionnaire_version:'v1',answers:[{question_code:'q1',value:'old',score:1}]});
const questionnaire=()=>({code:'Q',version:'v1',title:'Original questionnaire',type:'MedicalScale',questions:[{code:'q1',type:'Radio',title:'Original question',options:[{code:'old',content:'Original option'}]}]});
beforeEach(()=>{
 params={a:'old-sheet'};
 jest.spyOn(Taro,'getCurrentInstance').mockImplementation(()=>({router:{params}}));
 getAssessmentResponse.mockReset().mockResolvedValue(sheet());
 getQuestionnaire.mockReset().mockResolvedValue(questionnaire());
});
afterEach(()=>{if(tree)act(()=>tree.unmount());tree=null;jest.restoreAllMocks();});
const render=async()=>{await act(async()=>{tree=renderer.create(<Page/>);});};
test('loads the frozen questionnaire version and preserves the historical selection',async()=>{
 await render();
 expect(getQuestionnaire).toHaveBeenCalledWith('Q','v1',expect.objectContaining({lifetime:expect.any(Object)}));
 expect(getAssessmentResponse).toHaveBeenCalledWith('old-sheet',expect.objectContaining({showLoading:false,lifetime:expect.any(Object)}));
 expect(tree.root.findByType('answer').props).toMatchObject({value:'old',options:[expect.objectContaining({is_select:'1'})]});
});
test('missing frozen version fails explicitly without asking for the current version',async()=>{
 getAssessmentResponse.mockResolvedValue({...sheet(),questionnaire_version:''});
 await render();expect(getQuestionnaire).not.toHaveBeenCalled();
 expect(tree.root.findAllByType('answer')).toHaveLength(0);
 expect(tree.root.findByType(StatePanel).props.description).toContain('缺少原始题版');
});
test('mismatched version never renders answers against the newer questionnaire',async()=>{
 getQuestionnaire.mockResolvedValue({...questionnaire(),version:'v2'});
 await render();expect(tree.root.findAllByType('answer')).toHaveLength(0);
 expect(tree.root.findByType(StatePanel).props.description).toContain('原始题版不匹配');
});
test('session clearing removes visible private data and cancels its scope',async()=>{
 await render();const lifetime=getAssessmentResponse.mock.calls[0][1].lifetime;
 act(()=>clearPrivateSessionState());
 expect(lifetime.isActive()).toBe(false);
 expect(tree.root.findAllByType('answer')).toHaveLength(0);
 expect(tree.root.findByType(StatePanel).props.description).toContain('登录状态已变化');
});
test('a late sheet after session clearing cannot trigger questionnaire loading',async()=>{
 const pending=deferred();getAssessmentResponse.mockReturnValueOnce(pending.promise);
 await render();act(()=>clearPrivateSessionState());
 await act(async()=>pending.resolve(sheet()));
 expect(getQuestionnaire).not.toHaveBeenCalled();
 expect(tree.root.findAllByType('answer')).toHaveLength(0);
});
test('a late questionnaire after logout cannot restore private answers',async()=>{
 const pending=deferred();getQuestionnaire.mockReturnValueOnce(pending.promise);
 await render();act(()=>clearPrivateSessionState());
 await act(async()=>pending.resolve(questionnaire()));
 expect(tree.root.findAllByType('answer')).toHaveLength(0);
});
test('route changes discard old questionnaire results without ending the newer load',async()=>{
 const old=deferred(),current=deferred();getQuestionnaire.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
 await render();params={a:'new-sheet'};getAssessmentResponse.mockResolvedValue(sheet('new-sheet'));
 await act(async()=>tree.update(<Page/>));
 await act(async()=>old.resolve(questionnaire()));
 expect(tree.root.findByType(StatePanel).props.state).toBe('loading');
 await act(async()=>current.resolve({...questionnaire(),title:'New scope'}));
 expect(JSON.stringify(tree.toJSON())).toContain('New scope');
});
test('hiding cancels private work; showing reloads the same fixed version',async()=>{
 await render();const lifetime=getQuestionnaire.mock.calls[0][2].lifetime;
 act(()=>mockOnHide());expect(lifetime.isActive()).toBe(false);expect(tree.root.findAllByType('answer')).toHaveLength(0);
 await act(async()=>mockOnShow());expect(getAssessmentResponse).toHaveBeenCalledTimes(2);
 expect(getQuestionnaire.mock.calls[1][1]).toBe('v1');expect(tree.root.findAllByType('answer')).toHaveLength(1);
});
test('read failure has a retry that revalidates the original version',async()=>{
 getQuestionnaire.mockRejectedValueOnce(new Error('private-server-detail'));
 await render();expect(JSON.stringify(tree.toJSON())).not.toContain('private-server-detail');
 await act(async()=>tree.root.findByType(StatePanel).props.onAction());
 expect(getQuestionnaire.mock.calls[1][1]).toBe('v1');expect(tree.root.findAllByType('answer')).toHaveLength(1);
});
