# IAM REST 接入说明

## 当前契约

AuthN 使用 v3，Identity 保持 v2。开发、体验和正式环境均使用独立的 `iamAuthnHost`、`iamIdentityHost`；其他仍为 v2 的 IAM 接口才使用 `iamHost`。Collection 和 QS 业务接口保持 v1。

- 微信身份核验登录：`POST /api/v3/authn/login`，请求体为 `auth_method: "wechat"` 与 `method_payload.app_id/code`。
- 微信注册：`POST /api/v3/authn/signups/wechat-miniprogram`；账号开通与登录为不同操作。
- 刷新、注销、在线验证：AuthN v3 下的 `/refresh_token`、`/logout`、`/verify`。
- `verifyToken(token, expectedAudience)` 要求显式非空受众列表，去重并去除首尾空白，空元素拒绝。验证 Collection 场景时传 `["collection-api"]`，不得从收到的 Token 推导期望受众。资源服务器仍独立执行认证和授权，前端验证不能替代服务端检查。
- 登录响应继续读取 `access_token`、`refresh_token`、`token_type`、`expires_in`，不依赖租户声明。
- Identity 的个人资料、档案、ProfileLink 保持 `/api/v2/identity/*`。旧 `active` 入参仅在适配器内转换为 `include_revoked`。
- 不再导出已经退役的 `/authn/accounts/*` 接口，个人资料由 Identity 提供。

## 登录状态切换

IAM v5 上线已使旧 AccessToken、RefreshToken 和 Session 失效。旧令牌遭拒后，刷新失败会清除本地会话和关联隐私缓存，回到未登录状态；用户可重新通过微信登录。不能通过增加旧路径回退或跳过受众验证恢复旧登录态。

## 验证与发布

执行 `npm run verify:frontend`。IAM 契约及 Jest 测试覆盖三套环境版本、AuthN/Identity 路由、受众参数、旧刷新令牌失效后的新登录，以及注销后的延迟刷新不复活会话。

构建产物位于 `dist`。代码检查和构建通过不代表微信正式版已经更新；仍需开发者工具真机验证微信登录、注册、个人资料、档案访问、刷新、注销，再按微信平台流程上传、审核与发布。旧小程序包仍调用已退役的 AuthN v2，必须更新包。

## 2026-09-08 升级结果

73 个测试套件、355 个测试及完整前端验证通过。微信开发者工具已成功上传开发版本 `2026.09.08-iamv5`，上传回执保存在本地 `deploy_versions/2026.09.08-iamv5`。尚未完成真机登录验收、微信审核或正式发布，不能将开发版上传视为旧正式包已被替换。
