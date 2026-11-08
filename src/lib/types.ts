export type ReminderType = 'payment' | 'event' | 'reminder';
export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type DeleteScope = 'single' | 'all';
export type SnoozeDuration = '1h' | 'tonight' | 'tomorrow' | 'custom';

export interface Reminder {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  type: ReminderType;
  due_date: string | null;
  due_time: string | null;
  amount: number | null;
  is_completed: boolean;
  recurrence: Recurrence;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  group_id: string | null;
  skipped_dates: string[];
  snoozed_until: string | null;
}

export type ReminderFormData = {
  title: string;
  description: string;
  type: ReminderType;
  due_date: string;
  due_time: string;
  amount: string;
  recurrence: Recurrence;
};
