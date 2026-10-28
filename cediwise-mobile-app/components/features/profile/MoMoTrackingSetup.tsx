import { Platform } from "react-native";

import { AndroidMoMoTrackingSetup } from "./AndroidMoMoTrackingSetup";
import { IosMoMoTrackingSetup } from "./IosMoMoTrackingSetup";

type MoMoTrackingSetupProps = {
  userId: string | undefined;
};

export function MoMoTrackingSetup({ userId }: MoMoTrackingSetupProps) {
  if (Platform.OS === "android") {
    return <AndroidMoMoTrackingSetup userId={userId} />;
  }
  return <IosMoMoTrackingSetup userId={userId} />;
}
