/**
 * Register 组件统一导出
 * 提供三种导出方式：
 * 1. Register - 核心组件，需要传入 type 参数
 * 2. UserRegister - 用户注册组件（独立）
 * 3. ChildRegister - 受试者注册组件（独立）
 */

export { default as Register, REGISTER_TYPE } from './Register';
export { default as UserRegister } from './UserRegister';
export { default as ChildRegister } from './ChildRegister';

// 默认导出核心组件
export { default } from './Register';
