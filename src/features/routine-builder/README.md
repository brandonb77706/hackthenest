# routine-builder

Owner: Brandon. Components, logic, and tests for this feature live here. See CLAUDE.md for the rules.

## Screens (from the "Bridge Mockups" design)

| URL | What it does |
| --- | --- |
| `/routines` | Routines tab: every routine as a color card with time, steps, days, and today's status (Done / Next / Later / Not today). Tap to start, Edit to change |
| `/routines/new` | Full-screen maker: Say it / Type it / Build it myself or a quick start, then Making your steps, Check your steps, When do you do this?, and Ready |
| `/routines/<id>/edit` | Same maker, opened on Check your steps, with Delete |

Each step has a 🔊 button (`src/components/ReadAloudButton.tsx`). It uses ElevenLabs through `POST /api/speak`, or the free browser voice in `npm run dev` unless `NEXT_PUBLIC_VOICE_PROVIDER=elevenlabs`.

## API

All routes act on the current user (`getCurrentUserId()`).

| Route | Does |
| --- | --- |
| `GET /api/routines` | List routines with `step_count` |
| `POST /api/routines` | Create a routine and its steps together. 400 with plain `errors` if invalid |
| `GET /api/routines/<id>` | One routine with `steps` in order |
| `PATCH /api/routines/<id>` | Replace details and steps. Steps sent with an `id` keep it, so past check-ins still match |
| `DELETE /api/routines/<id>` | Delete the routine and its steps |
| `POST /api/routines/draft` | `{ goal, supportLevel? }` → an AI draft for the maker. Saves nothing |

## Shared pieces

- `routineInput.ts`: `checkRoutine()` runs in the browser and on the server. Limits: 1 to 15 steps, 80 letters per step, 1 to 120 minutes, at least one day. Routines also have a color (`tone`) and `remind`.
- `editorState.ts`: the maker's state changes, tested on their own.
- `aiDraft.ts` (server) and `supportLevel.ts` (browser-safe): Tell Bridge.
- `format.ts`: `formatTime("08:00")` gives "8:00 AM"; `formatDays()` gives "Every day", "Weekdays", or day names.
- `ui.ts`: the old pre-design button styles. Still used by George's lost mode page, so don't delete it yet.
