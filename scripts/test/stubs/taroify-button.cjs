const React = require('react');

const Button = React.forwardRef(({ children, ...props }, ref) => (
  React.createElement('taro-button', { ...props, ref }, children)
));
Button.displayName = 'TaroifyButton';
Button.Content = React.forwardRef(({ children, ...props }, ref) => (
  React.createElement('taroify-button-content', { ...props, ref }, children)
));
Button.Group = React.forwardRef(({ children, ...props }, ref) => (
  React.createElement('taroify-button-group', { ...props, ref }, children)
));

module.exports = Button;
module.exports.default = Button;
module.exports.__esModule = true;
