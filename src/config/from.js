const defaultConfig = {
  qwxEnv: {
    canInto: true,
    canSubmit: true
  },
  wxEnv: {
    canInto: true,
    canSubmit: true
  },
  needTesteeid: false,
  needWritedClose: false,
  actionAfterWited: 'goto-analysis'
}

const banQwxEnvConfig = {
  ...defaultConfig,
  qwxEnv: {
    canInto: false,
    canSubmit: false
  }
}

const fromConfigMap = {
  "1": { ...defaultConfig },
  "2": { ...defaultConfig, wxEnv: { canInto: false, canSubmit: false }, needTesteeid: true },
  "3": { ...banQwxEnvConfig, needWritedClose: true },
  "4": { ...defaultConfig, qwxEnv: { canInto: true, canSubmit: false } },
  "5": { ...banQwxEnvConfig },
  "6": { ...banQwxEnvConfig },
  "7": { ...banQwxEnvConfig },
  "8": { ...banQwxEnvConfig },
  "9": { ...banQwxEnvConfig },
  "10": { ...defaultConfig, qwxEnv: { canInto: true, canSubmit: false } },
  "11": { ...banQwxEnvConfig },
  "12": { ...banQwxEnvConfig },
  "13": { ...defaultConfig, qwxEnv: { canInto: true, canSubmit: false } },
  "14": { ...banQwxEnvConfig, needTesteeid: true },
  "15": { ...defaultConfig, wxEnv: { canInto: false, canSubmit: false }, needTesteeid: true },
  "16": { ...banQwxEnvConfig },
  "17": { ...defaultConfig, qwxEnv: { canInto: true, canSubmit: false } },
  "18": { ...banQwxEnvConfig, needWritedClose: true },
  "19": { ...banQwxEnvConfig }
}

export const getFromConfig = (fromCode) => {
  return fromConfigMap[fromCode]
}
