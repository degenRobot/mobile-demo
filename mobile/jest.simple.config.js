module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/src/**/__tests__/simple*.test.ts',
    '**/src/**/__tests__/gameState.test.ts',
    '**/src/**/__tests__/frenPetSimple.test.ts',
    '**/src/**/__tests__/gaslessFlow.test.ts'
  ],
  transform: {
    '^.+\\.ts$': ['babel-jest', { configFile: './babel.test.config.js' }],
  },
};