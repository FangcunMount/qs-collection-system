import React from "react";
import PropTypes from "prop-types";
import Register, { REGISTER_TYPE } from "./Register";

/**
 * 受试者/孩子注册组件（对外独立组件）
 * 包装了统一的 Register 组件，指定 type 为 'child'
 */
const ChildRegister = ({ goUrl, submitClose }) => {
  return (
    <Register 
      type={REGISTER_TYPE.CHILD}
      goUrl={goUrl}
      submitClose={submitClose}
    />
  );
};

ChildRegister.propTypes = {
  goUrl: PropTypes.string.isRequired,
  submitClose: PropTypes.bool
};

ChildRegister.defaultProps = {
  submitClose: false
};

export default ChildRegister;
