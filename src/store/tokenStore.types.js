/**
 * Token Store 类型定义文件
 * 为 JavaScript 文件提供类型提示
 */

/**
 * Token 数据结构
 * @typedef {Object} TokenData
 * @property {string} access_token - 访问令牌（JWT）
 * @property {string|null} refresh_token - 刷新令牌（UUID）
 * @property {string} token_type - Token 类型（通常是 "Bearer"）
 * @property {number} [expires_in] - access_token 过期时间（秒，如 899）
 * @property {number} created_at - 创建时间戳（本地添加）
 * @property {number} updated_at - 更新时间戳（本地添加）
 */

/**
 * Token Store 状态
 * @typedef {Object} TokenStoreState
 * @property {TokenData|null} tokenData - Token 数据
 */

/**
 * 监听器函数
 * @callback Listener
 * @param {TokenStoreState} state - 状态快照
 * @returns {void}
 */

export {};
