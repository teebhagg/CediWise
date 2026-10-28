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
  export type Notification = {
    request: {
      content: {
        data?: Record<string, unknown>;
        title?: string;
        body?: string;
      };
    };
  };

  export const AndroidImportance: {
    DEFAULT: number;
    HIGH: number;
  };

  export const AndroidNotificationVisibility: {
    PRIVATE: number;
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
      sound?: string | null;
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
      channelId?: string;
    };
    trigger:
      | null
      | {
          hour: number;
          minute: number;
          repeats?: boolean;
          channelId?: string;
        }
      | {
          type: "date";
          date: Date;
          channelId?: string;
        }
      | {
          type: "daily";
          hour: number;
          minute: number;
          channelId?: string;
        }
      | {
          type: "weekly";
          weekday: number;
          hour: number;
          minute: number;
          channelId?: string;
        };
  }): Promise<string>;

  export function cancelScheduledNotificationAsync(identifier: string): Promise<void>;
  export function getAllScheduledNotificationsAsync(): Promise<
    Array<{
      identifier: string;
      content: {
        data?: Record<string, unknown>;
      };
    }>
  >;
  export function addNotificationResponseReceivedListener(
    listener: (response: NotificationResponse) => void
  ): EventSubscription;
  export function addNotificationReceivedListener(listener: (notification: Notification) => void): EventSubscription;
  export function getLastNotificationResponseAsync(): Promise<NotificationResponse | null>;
}
