import React from "react";
import PropTypes from "prop-types";
import Register, { REGISTER_TYPE } from "./Register";

/**
 * 用户注册组件（对外独立组件）
 * 包装了统一的 Register 组件，指定 type 为 'user'
 */
const UserRegister = ({ goUrl, submitClose }) => {
  return (
    <Register 
      type={REGISTER_TYPE.USER}
      goUrl={goUrl}
      submitClose={submitClose}
    />
  );
};

UserRegister.propTypes = {
  goUrl: PropTypes.string.isRequired,
  submitClose: PropTypes.bool
};

UserRegister.defaultProps = {
  submitClose: false
};

export default UserRegister;
