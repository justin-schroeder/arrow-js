module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  collectCoverage: false,
  collectCoverageFrom: ['src/*'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/utils/'],
}
