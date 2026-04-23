export default {
  pages: [
    'pages/tab/home/index',
    'pages/tab/scales/index',
    'pages/assessment/fill/index',
    'pages/assessment/records/index',
    'pages/assessment/response/index',
    'pages/assessment/report/index',
    'pages/assessment/report-trend/index',
    'pages/assessment/report-pending/index',
    'pages/tab/me/index',
    'pages/system/error/index',
  ],
  subPackages: [
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
