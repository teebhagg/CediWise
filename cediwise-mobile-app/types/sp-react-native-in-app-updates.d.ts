declare module "sp-react-native-in-app-updates" {
  export interface IAUUpdateResult {
    shouldUpdate: boolean;
    // other fields may exist, but we only need shouldUpdate
  }
  export enum IAUUpdateKind {
    FLEXIBLE = "FLEXIBLE",
    IMMEDIATE = "IMMEDIATE",
  }
  export default class SpInAppUpdates {
    constructor(debug?: boolean);
    checkNeedsUpdate(options?: {
      curVersion?: string;
    }): Promise<IAUUpdateResult>;
    startUpdate(options: { updateType: IAUUpdateKind }): Promise<void>;
  }
}
