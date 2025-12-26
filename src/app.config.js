export default {
  pages: [
    'pages/home/index/index',
    'pages/questionnaire/list/index',
    'pages/questionnaire/fill/index',
    'pages/system/error/errpage',
  ],
  subPackages: [
    {
      root: 'pages/analysis',
      name: 'analysis',
      pages: [
        'index',
        'detail/index',
        'wait/index',
      ],
      independent: false
    },
    {
      root: 'pages/answersheet',
      name: 'answersheet',
      pages: [
        'list/index',
        'detail/index',
      ],
      independent: false
    },
    {
      root: 'pages/user',
      name: 'user',
      pages: [
        'register/index',
        'profile/index',
      ],
      independent: false
    },
    {
      root: 'pages/testee',
      name: 'testee',
      pages: [
        'register/index',
        'list/index',
        'editor/index',
      ],
      independent: false
    }
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: 'WeChat',
    navigationBarTextStyle: 'black'
  },
  entryPagePath: "pages/home/index/index",
  "__usePrivacyCheck__": true
}
