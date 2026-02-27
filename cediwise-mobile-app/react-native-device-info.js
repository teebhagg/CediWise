// react-native-device-info shim for Expo projects
import Constants from "expo-constants";
import { Platform } from "react-native";

export const getBundleId = () => {
  return Platform.OS === "android"
    ? (Constants.expoConfig?.android?.package ?? "")
    : (Constants.expoConfig?.ios?.bundleIdentifier ?? "");
};

export const getVersion = () => {
  return Constants.expoConfig?.version ?? "0.0.0";
};

export default { getBundleId, getVersion };
