const React = require('react');

const createHostComponent = (name) => {
  const Component = React.forwardRef(({ children, ...props }, ref) => (
    React.createElement(`taro-${name}`, { ...props, ref }, children)
  ));
  Component.displayName = `Taro${name}`;
  return Component;
};

module.exports = {
  Button: createHostComponent('button'),
  Image: createHostComponent('image'),
  Input: createHostComponent('input'),
  Navigator: createHostComponent('navigator'),
  OpenData: createHostComponent('open-data'),
  Picker: createHostComponent('picker'),
  ScrollView: createHostComponent('scroll-view'),
  Text: createHostComponent('text'),
  Textarea: createHostComponent('textarea'),
  View: createHostComponent('view')
};
