# routine-builder

Owner: Brandon. Components, logic, and tests for this feature live here. See CLAUDE.md for the rules.

## Pages

| URL | What it does |
| --- | --- |
| `/routines` | The user's routines: name, time, days, step count, Edit |
| `/routines/new` | Start: "Make it myself" or a quick start template |
| `/routines/new/blank` | Editor with an empty routine |
| `/routines/new/<template>` | Editor filled from a template (`take-medicine`, `morning`, `get-ready-for-work`, `bedtime`) |
| `/routines/<id>/edit` | Editor for a saved routine, with Delete |

Each step has a 🔊 Read aloud button (`src/components/ReadAloudButton.tsx`, shared with the step player). It uses ElevenLabs through `POST /api/speak` with the user's saved voice and speed, and the browser's own voice if ElevenLabs fails.

The editor has two screens: steps (name, steps, add/edit/move/remove), then "When do you do this?" (days and time). Nothing is saved until the person taps Save.

## API

All routes act on the current user (`getCurrentUserId()`).

| Route | Does |
| --- | --- |
| `GET /api/routines` | List routines with `step_count` |
| `POST /api/routines` | Create a routine and its steps together. 400 with plain `errors` if invalid |
| `GET /api/routines/<id>` | One routine with `steps` in order |
| `PATCH /api/routines/<id>` | Replace details and steps. Steps sent with an `id` keep it, so past check-ins still match |
| `DELETE /api/routines/<id>` | Delete the routine and its steps. Check-ins are kept as history |

Server code can call `listRoutines`, `getRoutine`, `createRoutine`, `updateRoutine`, and `deleteRoutine` from `service.ts` directly instead of going through the API.

## Shared pieces

- `routineInput.ts`: `checkRoutine()` runs in the browser and on the server. Limits: 1 to 15 steps, 80 letters per step, 1 to 120 minutes, at least one day.
- `format.ts`: `formatTime("08:00")` gives "8:00 AM"; `formatDays()` gives "Every day", "Weekdays", or day names.

## Not built yet

- "Tell Bridge" (AI drafts the steps from what the person says or types)
- "Start now" after saving, once the step player exists (Adrian)
- First routine tokens: a marked spot in `POST /api/routines` (Nati)
