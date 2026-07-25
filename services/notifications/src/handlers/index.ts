import { NotificationEventHandlers } from "./NotificationEventHandlers.js";

export const eventHandlers = [NotificationEventHandlers] as const;

export * from "./NotificationIngressService.js";
