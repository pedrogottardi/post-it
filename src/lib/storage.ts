import type { Reminder, ReminderFormData, Recurrence, SnoozeDuration } from './types';
import { daysBetween, getNextDate, shiftDate, toDateStr } from './dates';
import { getSnoozeTarget } from './snooze';
import { parseAmount } from './money';

const STORAGE_KEY = 'post-it-reminders';
const BACKUP_KEY = 'post-it-reminders-backup';
const MAX_INSTANCES: Record<Recurrence, number> = {
  none: 0,
  daily: 30,
  weekly: 12,
  monthly: 12,
  yearly: 5,
};

export type SeriesUpdate = {
  title: string;
  description: string | null;
  type: Reminder['type'];
  due_date: string;
  due_time: string | null;
  amount: number | null;
  recurrence: Recurrence;
};

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

class LocalStorage {
  private reminders: Map<string, Reminder> = new Map();
  private initialized = false;

  private ensureInit() {
    if (this.initialized) return;
    this.initialized = true;
    if (typeof window === 'undefined') return;

    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data: unknown = JSON.parse(raw);
      if (!Array.isArray(data)) throw new Error('Invalid reminders payload');
      for (const reminder of data as Reminder[]) {
        if (reminder && typeof reminder.id === 'string') {
          // Migração: campos novos
          const migrated: Reminder = {
            ...reminder,
            due_time: reminder.due_time ?? null,
            skipped_dates: reminder.skipped_dates ?? [],
            snoozed_until: reminder.snoozed_until ?? null,
          };
          this.reminders.set(reminder.id, migrated);
        }
      }
    } catch (e) {
      try {
        if (raw) window.localStorage.setItem(BACKUP_KEY, raw);
      } catch {
        /* storage indisponível */
      }
      console.error('Failed to read reminders, backup saved:', e);
      this.reminders.clear();
    }
  }

  async init() {
    this.ensureInit();
  }

  private persist() {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(this.reminders.values())));
    } catch (e) {
      console.error('Failed to persist reminders:', e);
    }
  }

  getAll(): Reminder[] {
    this.ensureInit();
    return Array.from(this.reminders.values());
  }

  getById(id: string): Reminder | undefined {
    this.ensureInit();
    return this.reminders.get(id);
  }

  create(data: ReminderFormData): Reminder[] {
    this.ensureInit();
    const now = new Date().toISOString();
    const recurrence = data.due_date ? data.recurrence : 'none';
    const isRecurring = recurrence !== 'none' && Boolean(data.due_date);
    const groupId = isRecurring ? newId() : null;

    const base: Omit<Reminder, 'id' | 'due_date' | 'created_at' | 'updated_at'> = {
      user_id: 'local',
      title: data.title.trim(),
      description: data.description.trim() || null,
      type: data.type,
      due_time: data.due_time || null,
      amount: parseAmount(data.amount),
      is_completed: false,
      recurrence,
      archived_at: null,
      group_id: groupId,
      skipped_dates: [],
      snoozed_until: null,
    };

    const rows: Reminder[] = [
      {
        ...base,
        id: newId(),
        due_date: data.due_date || null,
        created_at: now,
        updated_at: now,
      },
    ];

    if (isRecurring) {
      const max = MAX_INSTANCES[recurrence] ?? 12;
      let current = data.due_date;
      for (let i = 0; i < max; i++) {
        const next = getNextDate(recurrence, current);
        if (!next) break;
        rows.push({
          ...base,
          id: newId(),
          due_date: next,
          created_at: now,
          updated_at: now,
        });
        current = next;
      }
    }

    for (const reminder of rows) {
      this.reminders.set(reminder.id, reminder);
    }
    this.persist();
    return rows;
  }

  update(
    id: string,
    data: Partial<Omit<Reminder, 'id' | 'user_id' | 'created_at'>>
  ): Reminder | null {
    this.ensureInit();
    const existing = this.reminders.get(id);
    if (!existing) return null;

    const updated: Reminder = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
    };
    this.reminders.set(id, updated);
    this.persist();
    return updated;
  }

  updateSingle(id: string, data: SeriesUpdate): Reminder | null {
    const updates: Partial<Omit<Reminder, 'id' | 'user_id' | 'created_at'>> = {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      type: data.type,
      due_date: data.due_date,
      due_time: data.due_time,
      amount: data.amount,
      recurrence: data.recurrence,
    };
    if (data.recurrence === 'none') updates.group_id = null;
    return this.update(id, updates);
  }

  updateSeries(id: string, data: SeriesUpdate): { updated: Reminder[]; removed: Reminder[] } {
    this.ensureInit();
    const current = this.reminders.get(id);
    if (!current) return { updated: [], removed: [] };

    const now = new Date().toISOString();
    const updated: Reminder[] = [];
    const removed: Reminder[] = [];
    const groupId = current.group_id;
    const oldDate = current.due_date;
    const delta = oldDate ? daysBetween(oldDate, data.due_date) : 0;

    const shared = {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      type: data.type,
      amount: data.amount,
      due_time: data.due_time,
      updated_at: now,
    };

    const futureSiblings = groupId
      ? this.getGroup(groupId).filter(
          r => r.id !== id && !r.is_completed && (!oldDate || !r.due_date || r.due_date > oldDate)
        )
      : [];

    if (data.recurrence === 'none') {
      for (const sibling of futureSiblings) {
        this.reminders.delete(sibling.id);
        removed.push(sibling);
      }
      const next: Reminder = {
        ...current,
        ...shared,
        due_date: data.due_date,
        recurrence: 'none',
        group_id: null,
      };
      this.reminders.set(id, next);
      updated.push(next);
      this.persist();
      return { updated, removed };
    }

    if (!groupId) {
      const newGroupId = newId();
      const first: Reminder = {
        ...current,
        ...shared,
        due_date: data.due_date,
        recurrence: data.recurrence,
        group_id: newGroupId,
      };
      this.reminders.set(id, first);
      updated.push(first);

      let cursor = data.due_date;
      const max = MAX_INSTANCES[data.recurrence] ?? 12;
      for (let i = 0; i < max; i++) {
        const nextDate = getNextDate(data.recurrence, cursor);
        if (!nextDate) break;
        const row: Reminder = {
          ...first,
          id: newId(),
          due_date: nextDate,
          is_completed: false,
          archived_at: null,
          created_at: now,
          updated_at: now,
        };
        this.reminders.set(row.id, row);
        updated.push(row);
        cursor = nextDate;
      }
      this.persist();
      return { updated, removed };
    }

    const changedRecurrence = data.recurrence !== current.recurrence;

    if (changedRecurrence) {
      for (const sibling of futureSiblings) {
        this.reminders.delete(sibling.id);
        removed.push(sibling);
      }
    }

    const next: Reminder = {
      ...current,
      ...shared,
      due_date: data.due_date,
      recurrence: data.recurrence,
    };
    this.reminders.set(id, next);
    updated.push(next);

    if (changedRecurrence) {
      let cursor = data.due_date;
      const max = MAX_INSTANCES[data.recurrence] ?? 12;
      for (let i = 0; i < max; i++) {
        const nextDate = getNextDate(data.recurrence, cursor);
        if (!nextDate) break;
        const row: Reminder = {
          ...next,
          id: newId(),
          due_date: nextDate,
          is_completed: false,
          archived_at: null,
          created_at: now,
          updated_at: now,
        };
        this.reminders.set(row.id, row);
        updated.push(row);
        cursor = nextDate;
      }
    } else {
      for (const sibling of futureSiblings) {
        if (!sibling.due_date) continue;
        const row: Reminder = {
          ...sibling,
          ...shared,
          due_date: shiftDate(sibling.due_date, delta),
        };
        this.reminders.set(sibling.id, row);
        updated.push(row);
      }
    }

    this.persist();
    return { updated, removed };
  }

  delete(id: string): boolean {
    this.ensureInit();
    const removed = this.reminders.delete(id);
    if (removed) this.persist();
    return removed;
  }

  deleteMany(ids: string[]): void {
    this.ensureInit();
    let changed = false;
    for (const id of ids) {
      if (this.reminders.delete(id)) changed = true;
    }
    if (changed) this.persist();
  }

  restoreAll(reminders: Reminder[]) {
    this.ensureInit();
    for (const reminder of reminders) {
      this.reminders.set(reminder.id, reminder);
    }
    this.persist();
  }

  getGroup(groupId: string): Reminder[] {
    this.ensureInit();
    return Array.from(this.reminders.values()).filter(
      r => r.group_id === groupId && !r.archived_at
    );
  }

  getGroupAll(groupId: string): Reminder[] {
    this.ensureInit();
    return Array.from(this.reminders.values()).filter(r => r.group_id === groupId);
  }

  updateSiblings(
    groupId: string,
    excludeId: string,
    data: Partial<Pick<Reminder, 'title' | 'description' | 'type' | 'amount' | 'due_time'>>
  ) {
    this.ensureInit();
    const now = new Date().toISOString();
    for (const [id, reminder] of this.reminders) {
      if (reminder.group_id === groupId && reminder.id !== excludeId && !reminder.archived_at) {
        this.reminders.set(id, { ...reminder, ...data, updated_at: now });
      }
    }
    this.persist();
  }

  extendSeriesIfLast(id: string): Reminder | null {
    this.ensureInit();
    const current = this.reminders.get(id);
    if (!current?.group_id || !current.due_date || current.recurrence === 'none') return null;

    const members = this.getGroup(current.group_id);
    const hasFuture = members.some(
      r => r.id !== id && !r.is_completed && r.due_date && r.due_date > current.due_date!
    );
    if (hasFuture) return null;

    const nextDate = getNextDate(current.recurrence, current.due_date);
    if (!nextDate) return null;

    const now = new Date().toISOString();
    const next: Reminder = {
      ...current,
      id: newId(),
      due_date: nextDate,
      is_completed: false,
      archived_at: null,
      created_at: now,
      updated_at: now,
    };
    this.reminders.set(next.id, next);
    this.persist();
    return next;
  }

  getArchived(): Reminder[] {
    this.ensureInit();
    return Array.from(this.reminders.values()).filter(r => r.archived_at);
  }

  restoreArchived(id: string): void {
    this.ensureInit();
    const reminder = this.reminders.get(id);
    if (!reminder) return;
    this.reminders.set(id, {
      ...reminder,
      archived_at: null,
      updated_at: new Date().toISOString(),
    });
    this.persist();
  }

  snooze(id: string, duration: SnoozeDuration, customDate?: string): Reminder | null {
    this.ensureInit();
    const reminder = this.reminders.get(id);
    if (!reminder || !reminder.due_date) return null;

    const target = getSnoozeTarget(reminder.due_date, reminder.due_time, duration, customDate);
    if (!target) return null;

    // O adiamento move a própria ocorrência: dia/hora exibidos e agrupamento
    // passam a refletir o novo horário.
    return this.update(id, {
      due_date: toDateStr(target.getFullYear(), target.getMonth(), target.getDate()),
      due_time: `${String(target.getHours()).padStart(2, '0')}:${String(
        target.getMinutes()
      ).padStart(2, '0')}`,
      snoozed_until: target.toISOString(),
    });
  }

  clearSnooze(id: string): Reminder | null {
    this.ensureInit();
    return this.update(id, { snoozed_until: null });
  }

  ensureSeriesHaveFuture(): void {
    this.ensureInit();
    const now = new Date().toISOString();
    const allGroups = new Set(
      Array.from(this.reminders.values())
        .filter(r => r.group_id && r.recurrence !== 'none')
        .map(r => r.group_id!)
    );

    for (const groupId of allGroups) {
      const members = this.getGroup(groupId);
      const active = members.filter(r => !r.is_completed && !r.archived_at);
      const hasFuture = active.some(
        r => r.due_date && r.due_date > new Date().toISOString().slice(0, 10)
      );
      if (!hasFuture && active.length > 0) {
        const last = active.sort((a, b) => (b.due_date || '').localeCompare(a.due_date || ''))[0];
        if (last.due_date) {
          const nextDate = getNextDate(last.recurrence, last.due_date);
          if (nextDate) {
            const next: Reminder = {
              ...last,
              id: newId(),
              due_date: nextDate,
              is_completed: false,
              archived_at: null,
              created_at: now,
              updated_at: now,
            };
            this.reminders.set(next.id, next);
          }
        }
      }
    }
    this.persist();
  }

  exportAll(): string {
    this.ensureInit();
    return JSON.stringify(Array.from(this.reminders.values()), null, 2);
  }

  importAll(json: string): { imported: number; errors: number } {
    this.ensureInit();
    let imported = 0;
    let errors = 0;
    try {
      const data = JSON.parse(json);
      if (!Array.isArray(data)) throw new Error('Invalid format');
      for (const item of data) {
        if (item && typeof item.id === 'string') {
          const migrated: Reminder = {
            ...item,
            due_time: item.due_time ?? null,
            skipped_dates: item.skipped_dates ?? [],
            snoozed_until: item.snoozed_until ?? null,
          };
          this.reminders.set(item.id, migrated);
          imported++;
        } else {
          errors++;
        }
      }
      this.persist();
    } catch (e) {
      console.error('Import failed:', e);
      errors = 1;
    }
    return { imported, errors };
  }
}

export const storage = new LocalStorage();
