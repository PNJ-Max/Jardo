import type { Href } from 'expo-router';

import type { Reminder } from './reminders';

// expo-notifications ne programme rien dans un navigateur : le web n'a pas de rappels, et
// Réglages n'en parle pas.

export const remindersSupported = false;

export type NotificationPermission = 'granted' | 'denied' | 'undetermined';

export const getNotificationPermission = async (): Promise<NotificationPermission> => 'denied';

export const requestNotificationPermission = async (): Promise<NotificationPermission> => 'denied';

export const replaceReminders = async (_reminders: readonly Reminder[]) => {};

export const onReminderOpened = (_open: (href: Href) => void) => () => {};
