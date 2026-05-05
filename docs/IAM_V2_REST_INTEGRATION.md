# IAM V2 REST 接入说明

## 当前结论

qs-collection-system 继续使用 IAM V2 REST API，不迁移 V3。现有登录、注册、token 生命周期和建档流程保持不变。

## 契约边界

- 微信登录使用 `POST /api/v2/authn/login`，请求体固定为 `auth_method: "wechat"` 和 `method_payload.app_id/code`。
- 微信小程序注册使用 `POST /api/v2/authn/signups/wechat-miniprogram`，这是账号开通能力，不等同于登录。
- token 刷新、登出、在线校验分别使用 `/authn/refresh_token`、`/authn/logout`、`/authn/verify`。
- ProfileLink 查询使用 `GET /api/v2/identity/profile-links`。REST query 使用 `include_revoked` 表达是否包含已撤销关系。

## 兼容策略

`listProfileLinks` 仍接受旧入参 `active`，但只在前端 adapter 内转换，不再向 IAM 发送 `active` query：

- `active: true` -> `include_revoked: false`
- `active: false` -> `include_revoked: true`
- 未传过滤条件 -> 使用 IAM 默认行为，只返回 active ProfileLink

## 防漂移检查

运行：

```bash
npm run test:iam-contracts
```

该检查用于防止回退到旧 `/auth/login`、平铺登录 payload、或 ProfileLink wire `active` 参数。
