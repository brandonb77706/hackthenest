# Data model

Owner: Brandon. These are the shared types in `src/lib/types.ts`, and the database tables once a backend is chosen (Base44 entities or another option). Ask Brandon before adding or renaming fields.

Every entity is owned by the user who created it. Set security so users can only read and write their own records.

## UserProfile
| Field | Type | Notes |
| --- | --- | --- |
| name | string | |
| voice_id | string | ElevenLabs voice the user picked |
| speech_speed | number | 0.7 to 1.2, default 0.9 |
| support_level | enum: high, medium, low | How detailed steps are. Lowers as independence grows |
| demo_mode | boolean | Fast check-ins for the demo |
| current_streak | number | Days in a row with a finished routine |
| longest_streak | number | |
| streak_freezes | number | 0 to 2 |
| last_streak_date | date | Used to update the streak |
| equipped_avatar_id | reference | Avatar shown as the guide |

## Routine
| Field | Type | Notes |
| --- | --- | --- |
| title | string | |
| goal | string | What the user said |
| days | array of strings | e.g. ["mon","tue"] |
| start_time | string | "08:00" |
| active | boolean | |

## Step
| Field | Type | Notes |
| --- | --- | --- |
| routine_id | reference | |
| order | number | |
| text | string | Short, plain language |
| minutes | number | |
| image_url | string | Generated once |
| audio_url | string | ElevenLabs clip, generated once |

## CheckIn
| Field | Type | Notes |
| --- | --- | --- |
| step_id | reference | |
| routine_id | reference | |
| status | enum: done, skipped, stuck | |
| used_help | boolean | |
| time | datetime | |

## HelpRequest
| Field | Type | Notes |
| --- | --- | --- |
| type | enum: camera, stuck, lost, speak | |
| input_text | string | |
| image_url | string | Camera only |
| ai_response | string | |
| escalated | boolean | Sent to a trusted contact |

## TrustedContact
| Field | Type | Notes |
| --- | --- | --- |
| name | string | |
| method | enum: sms, email, telegram | |
| contact | string | |
| can_see_routines | boolean | Default false |
| can_get_lost_alerts | boolean | Default false |
| can_get_stuck_alerts | boolean | Default false |

## Reminder
| Field | Type | Notes |
| --- | --- | --- |
| title | string | |
| due | datetime | |
| source | enum: routine, camera | |
| sent | boolean | |

## SpeakPhrase
| Field | Type | Notes |
| --- | --- | --- |
| text | string | e.g. "I have a stutter, please give me a moment" |
| audio_url | string | Pre-generated for instant playback |
| order | number | |

## Avatar
Shared catalog, read-only for users.
| Field | Type | Notes |
| --- | --- | --- |
| name | string | |
| image_url | string | Pre-generated |
| unlock_type | enum: starter, shop, streak | |
| price | number | Shop only |
| streak_required | number | Streak only |

## UserAvatar
| Field | Type | Notes |
| --- | --- | --- |
| avatar_id | reference | |
| source | enum: starter, bought, streak | |
| unlocked_at | datetime | |

## TokenTransaction
| Field | Type | Notes |
| --- | --- | --- |
| amount | number | Positive = earned, negative = spent |
| reason | enum: step, routine, camera, first_routine, streak, purchase | |
| ref_id | string | CheckIn or Avatar id |
| time | datetime | |

Token balance = sum of the user's TokenTransactions. Only server code writes TokenTransactions, never the browser.

## Independence score

Calculated, not stored: share of steps in the last 7 days marked done without `used_help`. When it stays above 80% for a week, suggest lowering `support_level`.
