import * as Notifications from 'expo-notifications';
import type { Href } from 'expo-router';

import type { Reminder } from './reminders';

// Les notifications locales du téléphone ; notifications.web.ts les remplace dans le navigateur.

export const remindersSupported = true;

export type NotificationPermission = 'granted' | 'denied' | 'undetermined';

const channelId = 'reminders';

/** L'écran qu'ouvre le toucher d'un rappel. */
const reminderHref: Href = '/today';

// L'app ouverte, le rappel arrive dans la liste des notifications sans bannière ni son : l'écran
// montre déjà ce qu'il dit.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const permissionOf = ({ granted, status }: Notifications.NotificationPermissionsStatus): NotificationPermission =>
  granted ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';

export async function getNotificationPermission(): Promise<NotificationPermission> {
  return permissionOf(await Notifications.getPermissionsAsync());
}

/**
 * Demande la permission. Le canal doit exister avant : Android 13 n'affiche pas la demande sans
 * canal. Si l'utilisateur a déjà refusé, Android rend le refus sans rien demander.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  await Notifications.setNotificationChannelAsync(channelId, {
    name: 'Rappels du jardin',
    description: 'Le rappel du jour : ce qui attend au jardin.',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
  return permissionOf(await Notifications.requestPermissionsAsync());
}

let queue = Promise.resolve();

/**
 * Remplace tous les rappels programmés par ceux-ci. Les remplacements passent l'un après
 * l'autre : deux remplacements entremêlés laisseraient des rappels en double.
 */
export function replaceReminders(reminders: readonly Reminder[]): Promise<void> {
  queue = queue
    .then(async () => {
      await Notifications.cancelAllScheduledNotificationsAsync();
      for (const { date, body } of reminders) {
        await Notifications.scheduleNotificationAsync({
          content: { body, data: { href: reminderHref } },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId },
        });
      }
    })
    // Un rappel non programmé le sera au prochain changement ; l'app n'a rien à montrer.
    .catch(() => {});
  return queue;
}

/** Appelle `open` avec l'écran d'un rappel touché, y compris celui qui a lancé l'app. */
export function onReminderOpened(open: (href: Href) => void): () => void {
  const handle = (response: Notifications.NotificationResponse | null) => {
    const href = response?.notification.request.content.data?.href;
    if (typeof href === 'string') open(href as Href);
  };

  handle(Notifications.getLastNotificationResponse());
  Notifications.clearLastNotificationResponse();
  const subscription = Notifications.addNotificationResponseReceivedListener(handle);
  return () => subscription.remove();
}
