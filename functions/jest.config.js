//
// sri sri guru gauranga jayatah
//

module.exports = {
  preset: 'ts-jest',
  // Skip type-checking in tests to keep memory usage reasonable.
  // Type checking is done by tsc in the build step.
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        isolatedModules: true,
      },
    ],
  },
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/lib/', '/node_modules/'],
};
