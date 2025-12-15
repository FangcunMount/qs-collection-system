# 问卷填写页面

## 功能概述

问卷填写页面实现了两步式问卷填写流程：
1. **信息确认页面**：展示问卷信息和受试者信息
2. **问卷填写页面**：渲染问卷的所有问题并支持提交

## 目录结构

```
src/pages/questionnaire/fill/
├── index.jsx                    # 主入口，控制流程
├── index.less                   # 样式文件
├── index.config.js             # 页面配置
├── components/                  # 页面组件
│   ├── InfoConfirm.jsx         # 信息确认组件
│   └── InfoConfirm.less        # 信息确认样式
└── weight/                      # 原有组件（待整理）
    ├── questionsheet.jsx       # 问卷渲染组件
    ├── singlePageModel.jsx     # 单页模式组件
    ├── selectChildDialog.jsx   # 选择受试者弹窗
    └── ...
```

## 核心功能

### 1. 两步式流程

#### 第一步：信息确认
- 展示问卷信息（标题、说明、题目数量、预计用时）
- 展示受试者信息（姓名、性别、出生日期、标签）
- 温馨提示
- 确认按钮进入下一步

#### 第二步：问卷填写
- 渲染所有问题
- 支持多种题型（单选、多选、文本、数字、日期等）
- 题目验证
- 提交答卷

### 2. 数据适配

#### 新 API 数据结构适配

**问卷数据结构**：
```javascript
{
  code: "问卷编码",
  version: "版本号",
  title: "问卷标题",
  description: "问卷说明",
  questions: [
    {
      code: "题目编码",
      type: "题目类型",
      title: "题目标题",
      tips: "题目提示",
      placeholder: "占位符",
      validation_rules: [
        {
          rule_type: "required",
          target_value: "1"
        },
        {
          rule_type: "min_words",
          target_value: "10"
        }
      ],
      options: [
        {
          code: "选项编码",
          content: "选项内容",
          score: 分数
        }
      ]
    }
  ]
}
```

**答卷提交数据结构**：
```javascript
{
  questionnaire_code: "问卷编码",
  questionnaire_version: "版本号",
  testee_id: 受试者ID,
  title: "答卷标题",
  answers: [
    {
      question_code: "题目编码",
      question_type: "题目类型",
      value: "答案值（JSON字符串）",
      score: 分数
    }
  ]
}
```

### 3. 题目验证

支持的验证规则：
- `required`: 必填
- `min_words`: 最少字数
- `max_words`: 最多字数
- `min_value`: 最小值
- `max_value`: 最大值
- `min_select`: 最少选择数
- `max_select`: 最多选择数

### 4. 题型支持

- **Section**: 章节（无需答题）
- **Radio**: 单选题
- **CheckBox**: 多选题
- **Text**: 文本题
- **Textarea**: 多行文本题
- **Number**: 数字题
- **Date**: 日期题
- **Select**: 下拉选择题
- **ScoreRadio**: 评分题
- **ImageRadio**: 图片单选题
- **ImageCheckBox**: 图片多选题

## 相关文件

### API 文件

1. **questionnaireApi.js** (`src/services/api/questionnaireApi.js`)
   - `getQuestionnaire(code)`: 获取问卷详情，自动添加题号和初始值

2. **testeeApi.js** (`src/services/api/testeeApi.js`)
   - `getTestee(testeeId)`: 获取受试者详情

3. **answersheetApi.js** (`src/services/api/answersheetApi.js`)
   - `submitAnswersheet(data)`: 提交答卷

4. **questionsheetApi.js** (`src/services/api/questionsheetApi.js`)
   - `submitQuestionsheet(...)`: 答卷提交适配器，转换旧格式到新格式

### 工具文件

1. **utils.js** (`src/pages/questionnaire/shared/utils.js`)
   - `getValidationRule(rules, ruleType)`: 从validation_rules数组获取规则
   - `isQuestionRequired(question)`: 判断题目是否必填
   - `getQuestionPlaceholder(question)`: 获取题目占位符

### 组件文件

所有题目组件位于 `src/components/question/`，已全部适配新的 validation_rules 结构。

## 使用方式

### 页面跳转

```javascript
// 跳转到问卷填写页面
Taro.navigateTo({
  url: `/pages/questionnaire/fill/index?q=${questionnaireCode}&t=${testeeId}`
});
```

### 参数说明

- `q`: 问卷编码 (questionnaireCode)
- `t`: 受试者ID (testeeId)
- `signid`: 签名ID（可选，用于继续填写）
- `sp`: 是否单页模式（可选，"1"表示单页）

## 流程说明

```
页面加载
  ↓
解析参数
  ↓
验证受试者 ← 选择受试者（如果有多个）
  ↓
并行加载问卷和受试者信息
  ↓
显示信息确认页面
  ↓
用户确认
  ↓
进入问卷填写页面
  ↓
填写答题
  ↓
验证答案
  ↓
提交答卷
  ↓
跳转到答卷分析页面
```

## 注意事项

1. **必须先选择受试者**：在加载问卷前，必须确保已选择受试者
2. **数据格式转换**：提交时需要将旧格式转换为新 API 格式
3. **validation_rules 结构**：新 API 使用数组结构，需要使用工具函数获取规则值
4. **多选题答案格式**：多选题的答案需要转换为 JSON 字符串
5. **题号处理**：Section 类型题目不添加题号

## 后续优化

- [ ] 添加答题进度保存功能
- [ ] 支持答题中断后恢复
- [ ] 优化题目显示/隐藏逻辑
- [ ] 添加答题时间统计
- [ ] 支持题目跳转导航
