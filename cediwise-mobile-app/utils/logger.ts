import { consoleTransport, logger } from "react-native-logs";

import { captureErrorFromLogger } from "./telemetry";

const transport: typeof consoleTransport = (props) => {
  consoleTransport(props);
  captureErrorFromLogger(props.level.text, props.msg, props.rawMsg);
};

const config = {
  severity: __DEV__ ? "debug" : "error",
  transport,
};

const log = logger.createLogger(config);

export { log };
