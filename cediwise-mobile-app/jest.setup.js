global.__DEV__ = true;

jest.mock("react-native", () => ({
  DeviceEventEmitter: {
    addListener: jest.fn(),
    emit: jest.fn(),
  },
}));

jest.mock("react-native-url-polyfill/auto", () => {});

jest.mock("@react-native-async-storage/async-storage", () => {
  const mock = require("@react-native-async-storage/async-storage/jest/async-storage-mock");
  return mock.default || mock;
});

jest.mock("@/utils/supabase", () => ({ supabase: null }));

jest.mock("@/utils/logger", () => ({
  log: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
