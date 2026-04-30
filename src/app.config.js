export default {
  pages: [
    'pages/tab/home/index',
    'pages/tab/scales/index',
    'pages/tab/me/index',
    'pages/system/error/index',
  ],
  subPackages: [
    {
      root: 'pages/assessment',
      name: 'assessment',
      pages: [
        'fill/index',
        'records/index',
        'response/index',
        'report/index',
        'report-trend/index',
        'report-pending/index',
      ],
      independent: false
    },
    {
      root: 'pages/account',
      name: 'account',
      pages: [
        'register/index',
        'subscription/index',
      ],
      independent: false
    },
    {
      root: 'pages/testees',
      name: 'testees',
      pages: [
        'list/index',
        'create/index',
        'edit/index',
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
  entryPagePath: "pages/tab/home/index",
  "__usePrivacyCheck__": true
}
