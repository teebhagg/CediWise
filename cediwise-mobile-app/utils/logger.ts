import { consoleTransport, logger } from "react-native-logs";

const config = {
  severity: __DEV__ ? "debug" : "error",
  transport: consoleTransport,
};

const log = logger.createLogger(config);

export { log };
