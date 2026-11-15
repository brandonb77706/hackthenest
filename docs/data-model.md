# Data model

Owner: Brandon. Ask Brandon before adding or renaming fields.

Each entity is a MongoDB collection (Atlas, through Mongoose). Three places must match, and the type checker fails if the first two drift:
- the type in `src/lib/types.ts`
- the model in `src/lib/db/models/`
- the table on this page

## Rules for every entity

- **`id`:** Mongo's `_id` as a string. `toRecord(doc)` turns a document into the plain type, with `id` and ISO date strings.
- **`user_id`:** on every entity except Avatar. Every query must filter by it, and a guard rejects queries that don't. A server job that really needs every user's records (like check-in nudges) opts out with `.setOptions({ allUsers: true })`.
- **Current user:** `getCurrentUserId()` returns a fixed test user until real login is added.
- **References** (`routine_id`, `step_id`, ...) are ObjectIds in the database and strings in the types.

```ts
import { connectDB, getCurrentUserId, RoutineModel, toRecord } from "@/lib/db";
import type { Routine } from "@/lib/types";

await connectDB();
const user_id = await getCurrentUserId();
const docs = await RoutineModel.find({ user_id, active: true });
const routines = docs.map((d) => toRecord<Routine>(d));
```

## UserProfile
| Field | Type | Notes |
| --- | --- | --- |
| name | string | |
| voice_id | string | ElevenLabs voice the user picked |
| speech_speed | number | 0.7 to 1.2, default 0.9 |
| support_level | enum: high, medium, low | Default high. How detailed steps are. Lowers as independence grows |
| demo_mode | boolean | Fast check-ins for the demo |
| current_streak | number | Days in a row with a finished routine |
| longest_streak | number | |
| streak_freezes | number | 0 to 2, default 0 |
| last_streak_date | string "YYYY-MM-DD" | The user's local day, so time zones don't break streaks |
| equipped_avatar_id | reference | Avatar shown as the guide |

## Routine
| Field | Type | Notes |
| --- | --- | --- |
| title | string | |
| goal | string | What the user told Bridge. Empty for routines made by hand |
| days | array of strings | e.g. ["mon","tue"] |
| start_time | string | "08:00" |
| active | boolean | |
| tone | enum: teal, sea, orange, gold | Color on screen (blue, green, orange, yellow). Default teal |
| remind | boolean | Show check-ins for this routine. Default true |

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
| amount | whole number | Positive = earned. Negative only for `purchase`; the model rejects anything else |
| reason | enum: step, routine, camera, first_routine, streak, purchase | |
| ref_id | string | CheckIn or Avatar id |
| time | datetime | |

One profile per user (`user_id` is unique on UserProfile). A user can own each avatar once (unique on UserAvatar).

Token balance = sum of the user's TokenTransactions. Only server code writes TokenTransactions, never the browser.

## Independence score

Calculated, not stored: share of steps in the last 7 days marked done without `used_help`. When it stays above 80% for a week, suggest lowering `support_level`.
