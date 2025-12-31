/**
 * 首页配置常量
 */

// 快捷操作入口
export const QUICK_ACTIONS = [
  {
    label: "医学量表",
    desc: "浏览所有量表",
    url: "/pages/questionnaire/list/index",
    icon: "📋"
  },
  {
    label: "开始填写",
    desc: "快速进入问卷填写",
    url: "/pages/questionnaire/fill/index",
    icon: "📝"
  },
  {
    label: "我的答卷",
    desc: "查看历史记录",
    url: "/pages/answersheet/list/index",
    icon: "📄"
  },
  {
    label: "档案管理",
    desc: "管理档案信息",
    url: "/pages/testee/list/index",
    icon: "👶"
  },
  {
    label: "数据分析",
    desc: "查看统计报告",
    url: "/pages/analysis/index",
    icon: "📊"
  }
];

// 核心功能特性
export const FEATURES = [
  {
    icon: "📚",
    title: "专业量表库",
    desc: "内置心理测评、满意度调查等上百种标准量表"
  },
  {
    icon: "📱",
    title: "多端适配",
    desc: "支持微信、H5、PC端，一次创建多端使用"
  },
  {
    icon: "🔒",
    title: "数据安全",
    desc: "银行级加密存储，完善的权限管理体系"
  },
  {
    icon: "📊",
    title: "智能分析",
    desc: "AI驱动的数据分析，自动生成专业报告"
  },
  {
    icon: "⚡",
    title: "实时统计",
    desc: "数据实时同步，支持大规模并发填写"
  },
  {
    icon: "🎨",
    title: "自定义设计",
    desc: "可视化编辑器，支持逻辑跳转和个性化配置"
  },
  {
    icon: "🎯",
    title: "精准投放",
    desc: "支持定向分发，精准触达目标受众群体"
  },
  {
    icon: "💎",
    title: "专业服务",
    desc: "7×24小时技术支持，专业团队全程护航"
  }
];

// 应用场景
export const SCENARIOS = [
  {
    title: "心理健康评估",
    items: ["SCL-90量表", "焦虑自评量表", "抑郁自评量表", "心理压力测试", "职业倦怠量表"]
  },
  {
    title: "教育培训调研",
    items: ["课程满意度", "教学质量评估", "学习效果反馈", "培训需求调研", "学生发展评价"]
  },
  {
    title: "企业人力资源",
    items: ["员工满意度", "360度评估", "招聘测评", "绩效考核", "组织氛围调查"]
  },
  {
    title: "市场调研分析",
    items: ["用户体验研究", "产品满意度", "品牌认知度", "消费者行为", "竞品对比分析"]
  },
  {
    title: "医疗健康领域",
    items: ["患者满意度", "医疗服务评价", "健康风险筛查", "康复效果评估", "用药依从性"]
  },
  {
    title: "科研学术调查",
    items: ["问卷调研", "实验数据采集", "文献综述", "社会调查", "学术量表测评"]
  }
];

// 产品优势数据
export const ADVANTAGES = [
  { number: "99.9%", label: "系统可用性" },
  { number: "100万+", label: "累计答卷数" },
  { number: "500+", label: "标准量表" },
  { number: "10000+", label: "服务用户" }
];
