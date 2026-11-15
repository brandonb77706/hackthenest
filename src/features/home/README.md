# home

The Today tab (`/`) and the placeholder Scan, Help, and Me tabs, in the "Bridge Mockups" design.

- `today.ts`: what's on today and what's done (plain functions, tested).
- `service.ts` / `GET /api/today?tz=`: name, streak, tokens, and every routine's status for today.
- `POST /api/routines/<id>/steps/<stepId>/done`: the step player saves a finished step (a CheckIn with status `done`). No reminders; those are Nati's.
- Tab bar, Buddy, icons, and shared styles: `src/components/bridge/`. Design colors and fonts: `src/app/globals.css` and `src/app/layout.tsx`.
- Scan, Help, and Me are built: see `src/features/camera-help`, `src/features/help`, and `src/features/me`.
