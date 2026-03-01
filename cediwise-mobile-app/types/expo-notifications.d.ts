declare module "expo-notifications" {
  export type EventSubscription = { remove: () => void };
  export type NotificationResponse = {
    notification: {
      request: {
        content: {
          data?: Record<string, unknown>;
        };
      };
    };
  };

  export const AndroidImportance: {
    HIGH: number;
  };

  export const AndroidNotificationVisibility: {
    PUBLIC: number;
  };

  export function setNotificationHandler(handler: {
    handleNotification: () => Promise<{
      shouldShowAlert: boolean;
      shouldPlaySound: boolean;
      shouldSetBadge: boolean;
      shouldShowBanner?: boolean;
      shouldShowList?: boolean;
    }>;
  }): void;

  export function setNotificationChannelAsync(
    channelId: string,
    channel: {
      name: string;
      importance?: number;
      sound?: string;
      vibrationPattern?: number[];
      lockscreenVisibility?: number;
    }
  ): Promise<void>;

  export function getPermissionsAsync(): Promise<{ granted: boolean }>;
  export function requestPermissionsAsync(): Promise<{ granted: boolean }>;
  export function getExpoPushTokenAsync(options: { projectId: string }): Promise<{ data: string }>;

  export function scheduleNotificationAsync(input: {
    content: {
      title: string;
      body: string;
      data?: Record<string, unknown>;
    };
    trigger: {
      hour: number;
      minute: number;
      repeats?: boolean;
      channelId?: string;
    };
  }): Promise<string>;

  export function cancelScheduledNotificationAsync(identifier: string): Promise<void>;
  export function addNotificationResponseReceivedListener(
    listener: (response: NotificationResponse) => void
  ): EventSubscription;
  export function addNotificationReceivedListener(listener: () => void): EventSubscription;
  export function getLastNotificationResponseAsync(): Promise<NotificationResponse | null>;
}
