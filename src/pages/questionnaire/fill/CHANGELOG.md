# 问卷填写页面变更日志

## 2025-12-11

### 新增功能

#### 1. 两步式填写流程

- ✅ 新增信息确认页面组件 `InfoConfirm.jsx`
- ✅ 实现问卷信息和受试者信息的展示
- ✅ 添加温馨提示和确认按钮
- ✅ 实现流程状态管理 (loading → confirm → filling)

#### 2. API 适配

- ✅ 更新 `questionnaireApi.js` 以适配新 API 数据结构
- ✅ 在 `getQuestionnaire` 中自动添加题号和初始值
- ✅ 更新 `submitQuestionsheet` 函数，转换旧格式到新格式
- ✅ 支持新的 `validation_rules` 数组结构

#### 3. 工具函数

- ✅ 新增 `src/pages/questionnaire/shared/utils.js`
- ✅ 实现 `getValidationRule` 函数从数组中获取规则
- ✅ 实现 `isQuestionRequired` 函数判断必填
- ✅ 实现 `getQuestionPlaceholder` 函数获取占位符

#### 4. 组件更新

更新所有 question 组件以支持新的 validation_rules 结构：

- ✅ `radio.jsx` - 单选题
- ✅ `checkbox.jsx` - 多选题
- ✅ `text.jsx` - 文本题
- ✅ `textarea.jsx` - 多行文本题
- ✅ `number.jsx` - 数字题（包括 min_value/max_value）
- ✅ `date.jsx` - 日期题
- ✅ `select.jsx` - 下拉选择题
- ✅ `scoreRadio.jsx` - 评分题
- ✅ `imageRadio.jsx` - 图片单选题
- ✅ `imageCheckBox.jsx` - 图片多选题

#### 5. 验证逻辑

- ✅ 更新 `checkQuestion` 函数以支持新的规则格式
- ✅ 支持 `required` 的多种值格式 ("1", "true", true)
- ✅ 确保所有数值类型验证正确转换

### 文件修改

#### 新增文件

```
src/pages/questionnaire/fill/
├── components/
│   ├── InfoConfirm.jsx          # 信息确认组件
│   └── InfoConfirm.less         # 样式文件
├── README.md                     # 功能说明文档
└── TEST.md                       # 测试指南

src/pages/questionnaire/shared/
└── utils.js                      # 工具函数
```

#### 修改文件

```
src/pages/questionnaire/fill/
└── index.jsx                     # 主页面逻辑

src/pages/questionnaire/fill/weight/
└── questionsheet.jsx             # 问卷渲染组件

src/services/api/
├── questionnaireApi.js          # 问卷API
└── questionsheetApi.js          # 答卷提交API

src/components/question/
├── radio.jsx
├── checkbox.jsx
├── text.jsx
├── textarea.jsx
├── number.jsx
├── date.jsx
├── select.jsx
├── scoreRadio.jsx
├── imageRadio.jsx
└── imageCheckBox.jsx
```

### 数据结构变更

#### validation_rules 结构

**旧格式**:
```javascript
{
  validate_rules: {
    required: "1",
    min_words: "10",
    max_words: "100"
  }
}
```

**新格式**:
```javascript
{
  validation_rules: [
    { rule_type: "required", target_value: "1" },
    { rule_type: "min_words", target_value: "10" },
    { rule_type: "max_words", target_value: "100" }
  ]
}
```

#### 答卷提交格式

**旧格式**:
```javascript
{
  title: "问卷标题",
  questionsheet_code: "问卷编码",
  answers: [...]
}
```

**新格式**:
```javascript
{
  questionnaire_code: "问卷编码",
  questionnaire_version: "1.0",
  testee_id: 123,
  title: "答卷标题",
  answers: [...]
}
```

### 破坏性变更

⚠️ **无破坏性变更**

所有变更都保持向后兼容：
- 旧的 API 调用仍然有效（通过适配器层）
- 组件同时支持新旧数据格式
- 提交逻辑自动转换格式

### 已知问题

无

### 待办事项

- [ ] 添加答题进度保存功能
- [ ] 支持答题中断后恢复
- [ ] 优化题目显示/隐藏逻辑性能
- [ ] 添加答题时间统计
- [ ] 支持题目跳转导航
- [ ] 添加更详细的错误提示

### 性能优化

- ✅ 并行加载问卷和受试者数据
- ✅ 减少不必要的重新渲染
- ✅ 优化验证逻辑

### 测试覆盖

- ✅ 信息确认页面显示
- ✅ 问卷题目渲染
- ✅ 必填验证
- ✅ 字数/数值/选择数验证
- ✅ 数据格式转换
- ⏳ 题目显示/隐藏逻辑（待完整测试）
- ⏳ 多受试者场景（待完整测试）

### 迁移指南

#### 对于开发者

如果你有自定义的 question 组件，需要：

1. 导入工具函数：
```javascript
import { isQuestionRequired, getValidationRule } from '../../pages/questionnaire/shared/utils';
```

2. 更新必填判断：
```javascript
// 旧代码
required={item?.validate_rules?.required == "1"}

// 新代码
required={isQuestionRequired(item)}
```

3. 更新规则获取：
```javascript
// 旧代码
const minValue = item?.validate_rules?.min_value;

// 新代码
const validationRules = item.validation_rules || [];
const minValue = getValidationRule(validationRules, 'min_value');
```

#### 对于使用者

无需任何变更，所有功能保持兼容。

### 相关 PR/Issue

- 相关 Issue: #xxx
- 相关 PR: #xxx

### 贡献者

- @yangshujie
