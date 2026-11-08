import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { Reminder } from './types';

function isNative() {
  return Capacitor.isNativePlatform();
}

function hashId(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 2_147_483_647 || 1;
}

function getScheduleDateTime(dateStr: string, timeStr: string | null): Date {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
  if (timeStr) {
    const [h, min] = timeStr.split(':').map(Number);
    if (Number.isFinite(h) && Number.isFinite(min)) {
      return new Date(y, m - 1, d, h, min, 0);
    }
  }
  return new Date(y, m - 1, d, 9, 0, 0);
}

export async function requestNotificationPermission() {
  if (!isNative()) return false;
  try {
    const current = await LocalNotifications.checkPermissions();
    if (current.display === 'granted') return true;
    const requested = await LocalNotifications.requestPermissions();
    return requested.display === 'granted';
  } catch (e) {
    console.error('requestNotificationPermission error:', e);
    return false;
  }
}

async function hasPermission() {
  try {
    const permission = await LocalNotifications.checkPermissions();
    return permission.display === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleForReminder(reminder: Reminder) {
  if (!isNative()) return;
  if (!reminder.due_date || reminder.is_completed || reminder.archived_at) return;

  // Verifica se está sonecado para o futuro
  if (reminder.snoozed_until && new Date(reminder.snoozed_until).getTime() > Date.now()) {
    // Não agenda notificação normal, agenda para o horário do snooze
    await scheduleSnoozeNotification(reminder);
    return;
  }

  // Verifica se esta data foi pulada
  const todayStr = reminder.due_date.slice(0, 10);
  if (reminder.skipped_dates?.includes(todayStr)) return;

  const dueDateTime = getScheduleDateTime(reminder.due_date, reminder.due_time);
  if (dueDateTime.getTime() <= Date.now()) return;
  if (!(await hasPermission())) return;

  await cancelForReminder(reminder.id);

  const notifications = [
    {
      id: hashId('day_' + reminder.id),
      title: 'Post-it',
      body: `"${reminder.title}" vence hoje!`,
      schedule: { at: dueDateTime, allowWhileIdle: true },
    },
  ];

  const oneDayBefore = new Date(dueDateTime);
  oneDayBefore.setDate(oneDayBefore.getDate() - 1);
  if (oneDayBefore.getTime() > Date.now()) {
    notifications.push({
      id: hashId('1dbefore_' + reminder.id),
      title: 'Post-it',
      body: `"${reminder.title}" vence amanhã!`,
      schedule: { at: oneDayBefore, allowWhileIdle: true },
    });
  }

  try {
    await LocalNotifications.schedule({ notifications });
  } catch (e) {
    console.error('scheduleForReminder error:', e);
  }
}

async function scheduleSnoozeNotification(reminder: Reminder) {
  if (!reminder.snoozed_until) return;
  const snoozeTime = new Date(reminder.snoozed_until);
  if (snoozeTime.getTime() <= Date.now()) return;
  if (!(await hasPermission())) return;

  await cancelForReminder(reminder.id);

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: hashId('snooze_' + reminder.id),
          title: 'Post-it (adiado)',
          body: `"${reminder.title}" — lembrete adiado`,
          schedule: { at: snoozeTime, allowWhileIdle: true },
        },
      ],
    });
  } catch (e) {
    console.error('scheduleSnoozeNotification error:', e);
  }
}

export async function cancelForReminder(id: string) {
  if (!isNative()) return;
  try {
    await LocalNotifications.cancel({
      notifications: [
        { id: hashId('day_' + id) },
        { id: hashId('1dbefore_' + id) },
        { id: hashId('snooze_' + id) },
      ],
    });
  } catch (e) {
    console.error('cancelForReminder error:', e);
  }
}

export async function rescheduleAll(reminders: Reminder[]) {
  if (!isNative()) return;
  if (!(await hasPermission())) return;

  try {
    const { notifications: pending } = await LocalNotifications.getPending();
    const pendingIds = new Set(pending.map(n => n.id));
    const now = Date.now();

    for (const reminder of reminders) {
      if (!reminder.due_date || reminder.is_completed || reminder.archived_at) continue;

      // Se sonecado, agenda notificação de snooze
      if (reminder.snoozed_until && new Date(reminder.snoozed_until).getTime() > now) {
        if (!pendingIds.has(hashId('snooze_' + reminder.id))) {
          await scheduleSnoozeNotification(reminder);
        }
        continue;
      }

      // Verifica se a data foi pulada
      const todayStr = reminder.due_date.slice(0, 10);
      if (reminder.skipped_dates?.includes(todayStr)) continue;

      const dueDateTime = getScheduleDateTime(reminder.due_date, reminder.due_time);
      if (dueDateTime.getTime() <= now) continue;
      if (pendingIds.has(hashId('day_' + reminder.id))) continue;

      const notifications = [
        {
          id: hashId('day_' + reminder.id),
          title: 'Post-it',
          body: `"${reminder.title}" vence hoje!`,
          schedule: { at: dueDateTime, allowWhileIdle: true },
        },
      ];

      const oneDayBefore = new Date(dueDateTime);
      oneDayBefore.setDate(oneDayBefore.getDate() - 1);
      if (oneDayBefore.getTime() > now) {
        notifications.push({
          id: hashId('1dbefore_' + reminder.id),
          title: 'Post-it',
          body: `"${reminder.title}" vence amanhã!`,
          schedule: { at: oneDayBefore, allowWhileIdle: true },
        });
      }

      await LocalNotifications.schedule({ notifications });
    }
  } catch (e) {
    console.error('rescheduleAll error:', e);
  }
}
