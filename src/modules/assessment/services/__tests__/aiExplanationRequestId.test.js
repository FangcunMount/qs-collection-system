import Taro from '@tarojs/taro';
import { createAIRequestId } from '../aiExplanationRequestId';
import { isWorkflowRequestId } from '@/services/api/aiExplanationApi';
jest.mock('@tarojs/taro',()=>({...jest.requireActual('@tarojs/taro'),getRandomValues:jest.fn()}));
test('UUID uses 16 random bytes with correct version and variant bits',async()=>{
 const bytes=Uint8Array.from({length:16},(_,i)=>i);
 Taro.getRandomValues.mockResolvedValue({randomValues:bytes.buffer});
 const id=await createAIRequestId();
 expect(id).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f');
 expect(isWorkflowRequestId(id)).toBe(true);
 expect(Taro.getRandomValues).toHaveBeenCalledWith({length:16});
});
test.each([new ArrayBuffer(0),new ArrayBuffer(15),null])('invalid random data cannot create a request identity',async randomValues=>{
 Taro.getRandomValues.mockResolvedValue({randomValues});await expect(createAIRequestId()).rejects.toThrow();
});
