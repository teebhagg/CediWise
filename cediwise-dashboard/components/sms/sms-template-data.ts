export type SmsTemplateKey = 
  | "general_update"
  | "app_update"
  | "customer_checkin"
  | "support_response"
  | "feedback_followup"
  | "educational_tip"
  | "maintenance_notice"
  | "join_beta";

export interface SmsTemplate {
  label: string;
  message: string;
}

export const SMS_TEMPLATES: Record<SmsTemplateKey, SmsTemplate> = {
  general_update: {
    label: "General update",
    message: "Hi {{name}}! A quick update from CediWise: Thanks for being part of our community. We're working to help you manage your money better.",
  },
  app_update: {
    label: "New update (App)",
    message: "Hi {{name}}! New features on CediWise! Update your app on Play Store. Questions? Reply to this message!",
  },
  customer_checkin: {
    label: "Checking in (Satisfaction)",
    message: "Hi {{name}}! How has your CediWise experience been? We'd love to hear from you. Reply or visit cediwise.app/feedback",
  },
  support_response: {
    label: "Support response",
    message: "Hi {{name}}! You have an update from CediWise Support. Check your app for details. Need more help? Reply to this message.",
  },
  feedback_followup: {
    label: "Feedback follow-up",
    message: "Hi {{name}}! Thank you for your feedback on CediWise. We read every message and use it to improve. Keep sharing!",
  },
  educational_tip: {
    label: "Educational tip",
    message: "Hi {{name}}! Quick tip from CediWise: Small consistent savings lead to big results over time. Set aside a little each day and watch it grow!",
  },
  maintenance_notice: {
    label: "Maintenance notice",
    message: "Hi {{name}}! Quick heads up from CediWise: We'll be doing some maintenance soon. The app might be briefly unavailable. Sorry for any inconvenience!",
  },
  join_beta: {
    label: "Join Beta",
    message: "Hi {{name}}! Want early access to CediWise features? Join our Beta on Play Store: https://play.google.com/store/apps/details?id=com.cediwise.app",
  },
};

export const templateOptions: Array<{ label: string; value: SmsTemplateKey }> = [
  { label: "General update", value: "general_update" },
  { label: "New update (App)", value: "app_update" },
  { label: "Checking in (Satisfaction)", value: "customer_checkin" },
  { label: "Support response", value: "support_response" },
  { label: "Feedback follow-up", value: "feedback_followup" },
  { label: "Educational tip", value: "educational_tip" },
  { label: "Maintenance notice", value: "maintenance_notice" },
  { label: "Join Beta", value: "join_beta" },
];

export const SINGLE_SMS_LIMIT = 160;

export function getSegmentCount(message: string): number {
  if (message.length <= SINGLE_SMS_LIMIT) return 1;
  if (message.length <= 306) return 2;
  if (message.length <= 459) return 3;
  return Math.ceil(message.length / 153);
}

export function getRemainingChars(message: string): number {
  return Math.max(0, SINGLE_SMS_LIMIT - message.length);
}

export function personalizeMessage(message: string, name: string | undefined): string {
  const displayName = name?.trim() || "there";
  return message.replace(/\{\{name\}\}/g, displayName);
}
