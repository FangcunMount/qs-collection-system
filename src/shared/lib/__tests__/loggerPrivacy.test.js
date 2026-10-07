import { safeLogMetadata } from '../logMetadata';

const mockNormal = { log: jest.fn(), warn: jest.fn(), debug: jest.fn() };
const mockRealtime = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
jest.mock('@tarojs/taro', () => ({
  __esModule: true,
  default: { getAccountInfoSync: () => ({miniProgram:{version:'test'}}), canIUse: () => true,
    getLogManager: () => mockNormal, getRealtimeLogManager: () => mockRealtime },
}));
const { getLogger } = require('../logger');
let consoles;
beforeEach(() => { consoles=['log','warn','error'].map(key=>jest.spyOn(console,key).mockImplementation(()=>{})); });
afterEach(() => { consoles.forEach(log=>log.mockRestore()); });
test('all log sinks preserve allowed metadata without private payloads or exception text', () => {
  const sensitive={name:'private-name',birthday:'private-birthday',id_card_number:'private-id',token:'private-token',report:{text:'private-report'},answers:['private-answer'],url:'https://example.invalid/?token=private-query',statusCode:503,elapsedMs:12,requestId:'request-1'};
  const error=Object.assign(new Error('private-error-body'), {code:'503',data:sensitive});
  const log=getLogger('test');
  log.RUN('request_received', sensitive, 'private-free-text');
  log.WARN('request_failed', error);
  log.ERROR('request_failed', sensitive);
  const output=JSON.stringify([...consoles,...Object.values(mockNormal),...Object.values(mockRealtime)].flatMap(mock=>mock.mock.calls));
  expect(output).not.toMatch(/private-|example.invalid/);
  expect(output).toContain('request-1');expect(output).toContain('503');expect(output).toContain('Error');
  expect(mockRealtime.info).toHaveBeenCalled();expect(mockRealtime.warn).toHaveBeenCalled();expect(mockRealtime.error).toHaveBeenCalled();
});
test('arbitrary nested objects, errors, getters and non-finite values are not serialized', () => {
 const read=jest.fn(()=>{throw new Error('private-getter');});
 const object={status:'private-status',elapsedMs:Infinity,code:'private-secret',method:'private-method',requestId:'Bearer private-token',count:3};
 Object.defineProperty(object,'assessmentId',{get:read});
 const error = new Error('private-body');
 Object.defineProperty(error, 'name', {get:read});
 expect(safeLogMetadata([object, ['private-array']])).toEqual({count:3});
 expect(safeLogMetadata([error])).toEqual({errorClass:'Error'});expect(read).not.toHaveBeenCalled();
});
test('a failing telemetry sink cannot break a business path', () => {
 mockNormal.log.mockImplementationOnce(()=>{throw new Error('log-failure');});
 expect(()=>getLogger('test').RUN('completed',{status:'ready'})).not.toThrow();
 expect(mockRealtime.info).toHaveBeenCalled();
});
