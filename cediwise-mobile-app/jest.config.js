/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>"],
  setupFiles: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: [
    "**/calculators/__tests__/**/*.test.ts",
    "**/stores/__tests__/**/*.test.ts",
  ],
  collectCoverageFrom: [
    "calculators/**/*.ts",
    "!calculators/index.ts",
    "!calculators/__tests__/**",
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
