const React = require('react');

const createHostComponent = (name) => {
  const Component = React.forwardRef(({ children, ...props }, ref) => (
    React.createElement(`taroify-${name}`, { ...props, ref }, children)
  ));
  Component.displayName = `Taroify${name}`;
  return Component;
};

const Component = createHostComponent('component');
Component.Group = createHostComponent('group');
Component.Image = createHostComponent('image');
Component.Description = createHostComponent('description');
Component.Backdrop = createHostComponent('backdrop');
Component.Header = createHostComponent('header');
Component.Content = createHostComponent('content');
Component.Actions = createHostComponent('actions');
Component.Toolbar = createHostComponent('toolbar');
Component.Title = createHostComponent('title');
Component.Button = createHostComponent('button');
Component.Columns = createHostComponent('columns');
Component.Column = createHostComponent('column');
Component.Option = createHostComponent('option');
Component.open = jest.fn();
Component.success = jest.fn();
Component.fail = jest.fn();
Component.loading = jest.fn();
Component.close = jest.fn();

module.exports = Component;
module.exports.default = Component;
module.exports.__esModule = true;
[
  'Add', 'ArrowLeft', 'ArrowRight', 'BarChartOutlined', 'Checked', 'Clock',
  'Close', 'Cross', 'Delete', 'DescriptionOutlined', 'Edit', 'Fail',
  'FilterOutlined', 'FriendsOutlined', 'HomeOutlined', 'InfoOutlined',
  'NotesOutlined', 'Plus', 'RecordsOutlined', 'Replay', 'Search',
  'SettingOutlined', 'StarOutlined', 'Success', 'TodoListOutlined',
  'UserOutlined', 'WarningOutlined'
].forEach((name) => {
  module.exports[name] = createHostComponent(name.toLowerCase());
});
