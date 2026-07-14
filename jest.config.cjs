module.exports = {
  clearMocks: true,
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass|styl)$': '<rootDir>/scripts/test/stubs/style.cjs',
    '\\.(png|jpe?g|gif|webp|svg)$': '<rootDir>/scripts/test/stubs/file.cjs',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tarojs/components$': '<rootDir>/scripts/test/stubs/taro-components.cjs',
    '^@tarojs/taro$': '<rootDir>/scripts/test/stubs/taro.cjs',
    '^taro-ui$': '<rootDir>/scripts/test/stubs/taro-ui.cjs',
    '^taro-ui-fc$': '<rootDir>/scripts/test/stubs/taro-ui.cjs'
  },
  roots: ['<rootDir>/src', '<rootDir>/scripts/test'],
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  transform: {
    '^.+\\.[jt]sx?$': 'babel-jest'
  }
};
