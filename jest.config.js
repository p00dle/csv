module.exports = {
  transform: {
    '^.+\\.(t|j)sx?$': ['@swc-node/jest'],
  },
  testPathIgnorePatterns: ['node_modules'],
  testRegex: ['tests/*'],
  collectCoverage: true,
};
