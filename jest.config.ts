module.exports = {
  moduleDirectories: ['node_modules', 'release/app/node_modules', 'src'],
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json'],
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$':
      '<rootDir>/.erb/mocks/fileMock.js',
    '\\.(css|less|sass|scss)$': 'identity-obj-proxy',
  },
  setupFiles: ['./.erb/scripts/check-build-exists.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  testEnvironment: 'jsdom',
  testEnvironmentOptions: {
    url: 'http://localhost/',
  },
  testPathIgnorePatterns: ['release/app/dist', '.erb/dll'],
  transform: {
    '\\.[jt]sx?$': 'ts-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|react-markdown|trim-lines|ccount|escape-string-regexp|markdown-table|zwitch|longest-streak|hast-.*|unist-.*|unified|bail|is-plain-obj|trough|remark-.*|mdast-util-.*|micromark.*|decode-named-character-reference|character-entities|property-information|hast-util-whitespace|space-separated-tokens|comma-separated-tokens|vfile.*|@radix-ui|devlop|estree-.*|html-url-attributes)/)',
  ],
  modulePathIgnorePatterns: ['<rootDir>/release/app/package.json'],
  haste: {
    forceNodeFilesystemAPI: true,
    enableSymlinks: false,
  },
};
