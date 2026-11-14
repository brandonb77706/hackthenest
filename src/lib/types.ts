// Shared types. These match docs/data-model.md. Ask Brandon before adding or renaming fields.
// Dates and datetimes are ISO strings ("2026-11-14", "2026-11-14T09:00:00Z").

export type ID = string;

export type SupportLevel = "high" | "medium" | "low";
export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface UserProfile {
  id: ID;
  name: string;
  /** ElevenLabs voice the user picked */
  voice_id: string;
  /** 0.7 to 1.2, default 0.9 */
  speech_speed: number;
  /** How detailed steps are. Lowers as independence grows */
  support_level: SupportLevel;
  /** Fast check-ins for the demo */
  demo_mode: boolean;
  /** Days in a row with a finished routine */
  current_streak: number;
  longest_streak: number;
  /** 0 to 2 */
  streak_freezes: number;
  /** Used to update the streak */
  last_streak_date: string | null;
  /** Avatar shown as the guide */
  equipped_avatar_id: ID | null;
}

export interface Routine {
  id: ID;
  title: string;
  /** What the user said */
  goal: string;
  days: Weekday[];
  /** "08:00" */
  start_time: string;
  active: boolean;
}

export interface Step {
  id: ID;
  routine_id: ID;
  order: number;
  /** Short, plain language */
  text: string;
  minutes: number;
  /** Generated once */
  image_url: string | null;
  /** ElevenLabs clip, generated once */
  audio_url: string | null;
}

export type CheckInStatus = "done" | "skipped" | "stuck";

export interface CheckIn {
  id: ID;
  step_id: ID;
  routine_id: ID;
  status: CheckInStatus;
  used_help: boolean;
  time: string;
}

export type HelpRequestType = "camera" | "stuck" | "lost" | "speak";

export interface HelpRequest {
  id: ID;
  type: HelpRequestType;
  input_text: string;
  /** Camera only */
  image_url: string | null;
  ai_response: string;
  /** Sent to a trusted contact */
  escalated: boolean;
}

export type ContactMethod = "sms" | "email" | "telegram";

export interface TrustedContactPermissions {
  can_see_routines: boolean;
  can_get_lost_alerts: boolean;
  can_get_stuck_alerts: boolean;
}

/** Every sharing setting starts off. The user turns each one on. */
export const DEFAULT_CONTACT_PERMISSIONS: Readonly<TrustedContactPermissions> = Object.freeze({
  can_see_routines: false,
  can_get_lost_alerts: false,
  can_get_stuck_alerts: false,
});

export interface TrustedContact extends TrustedContactPermissions {
  id: ID;
  name: string;
  method: ContactMethod;
  contact: string;
}

export type ReminderSource = "routine" | "camera";

export interface Reminder {
  id: ID;
  title: string;
  due: string;
  source: ReminderSource;
  sent: boolean;
}

export interface SpeakPhrase {
  id: ID;
  /** e.g. "I have a stutter, please give me a moment" */
  text: string;
  /** Pre-generated for instant playback */
  audio_url: string | null;
  order: number;
}

export type AvatarUnlockType = "starter" | "shop" | "streak";

/** Shared catalog, read-only for users. */
export interface Avatar {
  id: ID;
  name: string;
  /** Pre-generated */
  image_url: string;
  unlock_type: AvatarUnlockType;
  /** Shop only */
  price: number | null;
  /** Streak only */
  streak_required: number | null;
}

export type UserAvatarSource = "starter" | "bought" | "streak";

export interface UserAvatar {
  id: ID;
  avatar_id: ID;
  source: UserAvatarSource;
  unlocked_at: string;
}

export type TokenReason = "step" | "routine" | "camera" | "first_routine" | "streak" | "purchase";

/** Only server code writes these. Balance = sum of the user's transactions. */
export interface TokenTransaction {
  id: ID;
  /** Positive = earned, negative = spent */
  amount: number;
  reason: TokenReason;
  /** CheckIn or Avatar id */
  ref_id: ID | null;
  time: string;
}
