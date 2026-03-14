global.__DEV__ = true;

jest.mock("react-native", () => ({
  DeviceEventEmitter: {
    addListener: jest.fn(),
    emit: jest.fn(),
  },
}));

jest.mock("@react-native-async-storage/async-storage", () => {
  const mock = require("@react-native-async-storage/async-storage/jest/async-storage-mock");
  return mock.default || mock;
});
