import React from 'react';
import renderer, {act} from 'react-test-renderer';
import Taro from '@tarojs/taro';
import Page from '../AccountSubscriptionPage';
import ActionButton from '@/shared/ui/ActionButton';
import {listPlanSubscribeStatuses, clearPlanSubscribeStatuses, requestPlanSubscribe} from '@/shared/ui/PlanSubscribeConfirm';
jest.mock('@/shared/ui/PlanSubscribeConfirm', () => ({listPlanSubscribeStatuses:jest.fn(),clearPlanSubscribeStatuses:jest.fn(),requestPlanSubscribe:jest.fn()}));
let tree;
beforeEach(() => {listPlanSubscribeStatuses.mockReturnValue([{scope_key:'private-scope-id',status:'accepted'}]);requestPlanSubscribe.mockResolvedValue({status:'accepted'});});
afterEach(() => {if(tree)act(()=>tree.unmount());tree=null;jest.restoreAllMocks();});
test('reminder page explains local status without exposing internal identifiers',async()=>{
 await act(async()=>{tree=renderer.create(<Page/>);});
 const text=JSON.stringify(tree.toJSON());
 expect(text).not.toContain('private-scope-id');expect(text).not.toContain('当前模板');
 expect(text).toContain('实际消息接收状态以微信侧为准');
 const modal=jest.spyOn(Taro,'showModal');
 act(()=>tree.root.findAllByType(ActionButton).find(button=>button.props.className==='subscription-clear').props.onClick());
 expect(modal.mock.calls[0][0].content).toContain('不会取消微信订阅');
 act(()=>modal.mock.calls[0][0].success({confirm:false}));expect(clearPlanSubscribeStatuses).not.toHaveBeenCalled();
 act(()=>modal.mock.calls[0][0].success({confirm:true}));expect(clearPlanSubscribeStatuses).toHaveBeenCalledTimes(1);
});
test('friendly reminder action retains the existing authorization behavior',async()=>{
 await act(async()=>{tree=renderer.create(<Page/>);});
 await act(async()=>tree.root.findAllByType(ActionButton)[0].props.onClick());
 expect(requestPlanSubscribe).toHaveBeenCalledWith(expect.objectContaining({force:true,scopeKeyOverride:'manual:task-opened'}));
});
