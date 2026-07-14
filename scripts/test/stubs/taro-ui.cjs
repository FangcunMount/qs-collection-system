const React = require('react');

const createHostComponent = (name) => {
  const Component = React.forwardRef(({ children, ...props }, ref) => (
    React.createElement(`taro-ui-${name}`, { ...props, ref }, children)
  ));
  Component.displayName = name;
  return Component;
};

module.exports = {
  AtActivityIndicator: createHostComponent('activity-indicator'),
  AtButton: createHostComponent('button'),
  AtFloatLayout: createHostComponent('float-layout'),
  AtIcon: createHostComponent('icon'),
  AtInput: createHostComponent('input'),
  AtList: createHostComponent('list'),
  AtListItem: createHostComponent('list-item'),
  AtModal: createHostComponent('modal'),
  AtModalAction: createHostComponent('modal-action'),
  AtModalContent: createHostComponent('modal-content'),
  AtModalHeader: createHostComponent('modal-header'),
  AtProgress: createHostComponent('progress'),
  AtRadio: createHostComponent('radio'),
  AtTextarea: createHostComponent('textarea')
};
