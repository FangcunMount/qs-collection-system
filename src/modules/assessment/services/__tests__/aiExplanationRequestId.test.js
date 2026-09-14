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
 expect(Taro.getRandomValues).toHaveBeenCalledWith(expect.objectContaining({length:16,success:expect.any(Function),fail:expect.any(Function)}));
});
test.each([new ArrayBuffer(0),new ArrayBuffer(15),null])('invalid random data cannot create a request identity',async randomValues=>{
 Taro.getRandomValues.mockResolvedValue({randomValues});await expect(createAIRequestId()).rejects.toThrow();
});
test('Taro 3.6 native callback returns void and must finish before UUID creation', async () => {
 let succeed;
 Taro.getRandomValues.mockImplementation(options => { succeed = options.success; return undefined; });
 let resolved = false;
 const result = createAIRequestId().then(id => { resolved = true; return id; });
 await Promise.resolve();
 expect(resolved).toBe(false);
 succeed({ randomValues: Uint8Array.from({length:16}, (_,i)=>i).buffer });
 await expect(result).resolves.toBe('00010203-0405-4607-8809-0a0b0c0d0e0f');
});
test('native failure is a preparation failure, not an unknown submission', async () => {
 Taro.getRandomValues.mockImplementation(options => { options.fail({errMsg:'not supported'}); });
 await expect(createAIRequestId()).rejects.toMatchObject({code:'AI_REQUEST_PREPARATION_FAILED'});
});
