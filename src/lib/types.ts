// Shared types. These match docs/data-model.md and the Mongoose models in src/lib/db/models/.
// Ask Brandon before adding or renaming fields.
//
// Ids are strings (MongoDB ObjectIds as hex). Datetimes are ISO strings ("2026-11-14T09:00:00.000Z").

export type ID = string;

/** Every record a user owns has this. Avatar (the shared catalog) is the only entity without it. */
export interface Owned {
  user_id: ID;
}

export const SUPPORT_LEVELS = ["high", "medium", "low"] as const;
export type SupportLevel = (typeof SUPPORT_LEVELS)[number];

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/** A routine's color on screen. Names match the design: teal = blue, sea = green. */
export const ROUTINE_TONES = ["teal", "sea", "orange", "gold"] as const;
export type RoutineTone = (typeof ROUTINE_TONES)[number];

export interface UserProfile extends Owned {
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
  /** "YYYY-MM-DD" in the user's day. Used to update the streak */
  last_streak_date: string | null;
  /** Avatar shown as the guide */
  equipped_avatar_id: ID | null;
  /** Color scheme id from src/lib/theme.ts, like "blue" or "contrast" */
  color_scheme: string;
  /** Show the Buddy on the tab bar */
  show_buddy: boolean;
  /** True once Welcome (name, Buddy) is finished after the first sign-in */
  onboarded: boolean;
}

export interface Routine extends Owned {
  id: ID;
  title: string;
  /** What the user told Bridge. Empty for routines made by hand */
  goal: string;
  days: Weekday[];
  /** "08:00" */
  start_time: string;
  active: boolean;
  /** Color on screen */
  tone: RoutineTone;
  /** Show check-ins for this routine */
  remind: boolean;
  /** A guardian who added it for the user, or null if the user made it */
  added_by: ID | null;
}

export interface Step extends Owned {
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

export const CHECK_IN_STATUSES = ["done", "skipped", "stuck"] as const;
export type CheckInStatus = (typeof CHECK_IN_STATUSES)[number];

export interface CheckIn extends Owned {
  id: ID;
  step_id: ID;
  routine_id: ID;
  status: CheckInStatus;
  used_help: boolean;
  time: string;
}

export const HELP_REQUEST_TYPES = ["camera", "stuck", "lost", "speak"] as const;
export type HelpRequestType = (typeof HELP_REQUEST_TYPES)[number];

export interface HelpRequest extends Owned {
  id: ID;
  type: HelpRequestType;
  input_text: string;
  /** Camera only */
  image_url: string | null;
  ai_response: string;
  /** Sent to a trusted contact */
  escalated: boolean;
}

export const CONTACT_METHODS = ["sms", "email", "telegram"] as const;
export type ContactMethod = (typeof CONTACT_METHODS)[number];

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

export interface TrustedContact extends Owned, TrustedContactPermissions {
  id: ID;
  name: string;
  method: ContactMethod;
  contact: string;
  /** Who they are to the user, like "Your brother". Shown under their name */
  relation: string;
  /** A guardian who added them for the user, or null if the user did */
  added_by: ID | null;
}

/**
 * A guardian (parent, aide, job coach) linked to a user. The accounts stay
 * separate. The guardian sees only what the user shares, and sharing starts off.
 */
export interface GuardianLink extends TrustedContactPermissions {
  id: ID;
  /** The person using Bridge */
  user_id: ID;
  /** Their guardian's account */
  guardian_id: ID;
  /** Set by the guardian. On by default: the user makes and changes their own routines */
  user_can_edit_routines: boolean;
  /** Set by the guardian. On by default: the user adds and changes their own trusted contacts */
  user_can_edit_contacts: boolean;
  created_at: string;
}

/** Who made a setup code. The other side enters it. */
export const SETUP_CODE_FROM = ["user", "guardian"] as const;
export type SetupCodeFrom = (typeof SETUP_CODE_FROM)[number];

/** A one-time code that links a user and a guardian. Lasts 24 hours, works once. */
export interface SetupCode {
  id: ID;
  code: string;
  from_role: SetupCodeFrom;
  created_by: ID;
  /** A guardian setting Bridge up for someone types their name, so Welcome can fill it in */
  name: string | null;
  expires_at: string;
  used_at: string | null;
  used_by: ID | null;
}

export const REMINDER_SOURCES = ["routine", "camera"] as const;
export type ReminderSource = (typeof REMINDER_SOURCES)[number];

export interface Reminder extends Owned {
  id: ID;
  title: string;
  due: string;
  source: ReminderSource;
  sent: boolean;
}

export interface SpeakPhrase extends Owned {
  id: ID;
  /** e.g. "I have a stutter, please give me a moment" */
  text: string;
  /** Pre-generated for instant playback */
  audio_url: string | null;
  order: number;
}

export const AVATAR_UNLOCK_TYPES = ["starter", "shop", "streak"] as const;
export type AvatarUnlockType = (typeof AVATAR_UNLOCK_TYPES)[number];

/** Shared catalog, read-only for users. Not owned by any user. */
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

export const USER_AVATAR_SOURCES = ["starter", "bought", "streak"] as const;
export type UserAvatarSource = (typeof USER_AVATAR_SOURCES)[number];

export interface UserAvatar extends Owned {
  id: ID;
  avatar_id: ID;
  source: UserAvatarSource;
  unlocked_at: string;
}

export const TOKEN_REASONS = ["step", "routine", "camera", "first_routine", "streak", "purchase"] as const;
export type TokenReason = (typeof TOKEN_REASONS)[number];

/** Only server code writes these. Balance = sum of the user's transactions. */
export interface TokenTransaction extends Owned {
  id: ID;
  /** Positive = earned, negative = spent (purchase only) */
  amount: number;
  reason: TokenReason;
  /** CheckIn or Avatar id */
  ref_id: ID | null;
  time: string;
}
