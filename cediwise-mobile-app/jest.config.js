/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/calculators"],
  testMatch: ["**/__tests__/**/*.test.ts"],
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
