import type { AIState } from '../services/aiExplanationController';
import type { SourceState } from '@/services/api/aiExplanationApi';

export const aiSourceNotice = (state?: SourceState) => ({
  current: '关联本次测评，结合标准报告一起阅读。',
  stale: '标准报告已更新，这份解读基于之前的报告。请结合当前标准报告阅读。',
  unavailable: '暂时无法核实关联报告，请结合可用的标准报告谨慎阅读。',
  unknown: '暂时无法确认报告版本，可以刷新状态后再查看。',
}[state || 'unknown']);
export function aiStateCopy(state: AIState): { title: string; description: string; action?: string } {
  switch (state.view) {
    case 'checking': return { title: '正在查询解读状态', description: '请稍候' };
    case 'ready': return { title: '进一步理解这份结果', description: '基于本次测评结果，帮助理解多个维度之间的关系，并提供可以尝试的日常建议。', action: '开始解读' };
    case 'submitting': return { title: '正在提交请求', description: '请勿重复提交。你可以返回标准报告。' };
    case 'waiting': if (state.refreshError) return { title: '暂时无法更新解读状态', description: '正在尝试重新查询，标准报告仍可继续阅读。' };
      return { title: state.output?.status === 'pending' ? '请求已接收，等待开始' : '解读正在生成',
      description: state.longWait ? '所需时间较长，你可以先阅读标准报告，稍后再查看。' : '你可以返回标准报告，稍后再查看。' };
    case 'failed': return { title: '本次 AI 解读未完成', description: state.output?.failure?.safe_message || '本次未能提供可展示的补充解读，标准报告仍可正常阅读。', action: '刷新状态' };
    case 'limited': return { title: '请求暂受限制', description: state.retryAt ? `请在 ${new Date(state.retryAt).toLocaleString()} 后再试，标准报告仍可正常阅读。` : '请稍后再试，标准报告仍可正常阅读。', action: '刷新状态' };
    case 'unconfirmed': return { title: '暂未确认请求结果', description: '暂时无法确认请求是否已被接收。再次请求时，会由服务端检查是否已有相同请求。', action: '再次请求' };
    case 'paused': return { title: '暂时无法更新解读状态', description: '可以稍后回来查看。已接收的请求不会因为离开页面而取消。', action: '刷新状态' };
    case 'unsupported': return { title: '当前版本暂不支持展示', description: '这份解读的数据格式暂不受支持，请继续阅读标准报告。' };
    case 'forbidden': return { title: '无法访问这份解读', description: '当前账号没有访问权限，请返回标准报告。' };
    case 'authRequired': return { title: '请先完成登录', description: '登录后可查看 AI 补充解读。请返回“我的”完成登录后再进入。' };
    case 'invalid': return { title: '测评参数不完整', description: '请从本次标准报告重新进入。' };
    default: return { title: state.output?.status === 'not_ready' ? '标准报告尚未就绪' : 'AI 解读暂不可用', description: '当前暂时无法提供补充解读，标准报告仍可独立阅读。', action: '刷新状态' };
  }
}
