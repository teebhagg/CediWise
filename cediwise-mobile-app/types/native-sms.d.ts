declare module "react-native-get-sms-android" {
  type SmsListFilter = {
    box?: string;
    minDate?: number;
    maxDate?: number;
    address?: string;
    body?: string;
  };

  type SmsAndroidModule = {
    list: (
      filter: string,
      failCallback: (error: string) => void,
      successCallback: (count: number, smsList: string) => void,
    ) => void;
  };

  const SmsAndroid: SmsAndroidModule;
  export default SmsAndroid;
}

declare module "react-native-android-sms-listener" {
  export type AndroidSmsListenerMessage = {
    originatingAddress: string;
    body: string;
    timestamp: number;
  };

  export type CancellableSubscription = {
    remove: () => void;
  };

  type SmsListenerModule = {
    addListener: (
      listener: (message: AndroidSmsListenerMessage) => void,
    ) => CancellableSubscription;
  };

  const SmsListener: SmsListenerModule;
  export default SmsListener;
}
