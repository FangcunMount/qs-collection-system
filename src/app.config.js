const pages = [
    'pages/tab/home/index',
    'pages/tab/me/index',
    'pages/system/error/index',
];

if (process.env.NODE_ENV === 'development') {
  pages.push('pages/system/ui-lab/index');
}

export default {
  pages,
  subPackages: [
    {
      root: 'pages/catalog-medical',
      name: 'catalog-medical',
      pages: [
        'index',
        'list/index',
      ],
      independent: false,
    },
    {
      root: 'pages/catalog-personality',
      name: 'catalog-personality',
      pages: [
        'index',
        'model/index',
      ],
      independent: false,
    },
    {
      root: 'pages/catalog-ability',
      name: 'catalog-ability',
      pages: [
        'index',
      ],
      independent: false,
    },
    {
      root: 'pages/assessment',
      name: 'assessment',
      pages: [
        'fill/index',
        'records/index',
        'response/index',
        'report/index',
        'personality-report/index',
        'report-trend/index',
        'report-pending/index',
      ],
      independent: false,
    },
    {
      root: 'pages/account',
      name: 'account',
      pages: [
        'register/index',
        'subscription/index',
      ],
      independent: false,
    },
    {
      root: 'pages/testees',
      name: 'testees',
      pages: [
        'list/index',
        'create/index',
        'edit/index',
      ],
      independent: false,
    },
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: 'WeChat',
    navigationBarTextStyle: 'black',
  },
  entryPagePath: 'pages/tab/home/index',
  '__usePrivacyCheck__': true,
};
