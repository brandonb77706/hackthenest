# notifications

Owner: Nati. Components, logic, and tests for this feature live here. See CLAUDE.md for the rules.

## Delivery decision

No provider is selected. `docs/architecture.md` explicitly leaves in-app,
Telegram, or email to Nati; the repository has no Postmark or other notification
integration, dependency, or environment setting. This demo uses local React state
to prove one in-page notification. It does not select a production delivery method.

## Try the standalone demo

From the repository root (use `npm`/`npx` instead of `.cmd` outside Windows):

```powershell
npm.cmd ci
npx.cmd vite --config src/features/notifications/demo/vite.config.mts
```

Vite is already included by the locked Vitest tooling; no dependencies were added.
Open http://127.0.0.1:5173. Click **Send test check-in**, or Tab to it and press
Enter. A morning routine reminder appears and is announced politely by screen
readers. Send again to increment its number. **Dismiss check-in** clears the
reminder; refresh resets the demo. Stop the server with Ctrl+C.

The demo needs no keys, account, browser notification permission, or external
service. Dependencies must be installed first. Nothing goes to trusted contacts;
there is no sharing control or contact transport. No persistence, scheduled
delivery, CheckIn record, or token mutation occurs. A nudge is distinct from the
shared `CheckIn` entity, which records a done/skipped/stuck response.

## Integration handoff (not applied)

Adrian/Brandon can import and render the component in a Next.js page:

```tsx
import { CheckInDemo } from "@/features/notifications/CheckInDemo";

export default function Page() {
  return <CheckInDemo />;
}
```

That requires app-level wiring in `src/app/`, outside Nati's scope. The standalone
preview works without it. No shared type changes are needed for this milestone.

Team decisions before production work:

- Nati/team: choose in-app, email (provider still open, including Postmark), or
  Telegram delivery and recipient consent behavior.
- MongoDB Atlas/Mongoose is now the team's database. Brandon/team still need to
  agree on authenticated delivery, scheduling, retries and duplicate prevention.
  Keep credentials server-side.
- Adrian/Brandon: choose the app route and supply real routine/step context.
  Wire `UserProfile.demo_mode` for the documented 20-second demo schedule later.
- Brandon: approve any future shared delivery/receipt types. Current `CheckIn`
  and `Reminder` types have not been changed.

## Verification

```powershell
npm.cmd test -- src/features/notifications/CheckInDemo.test.tsx
npm.cmd test
npm.cmd run lint
npx.cmd next typegen
npx.cmd tsc --noEmit
npm.cmd run build
```

Focused tests cover initial silence, keyboard delivery, repeated delivery,
dismissal, reset on remount, and no fetch or notification-permission request.
On a fresh checkout, `next typegen` generates the existing app's `LayoutProps`
helper before TypeScript runs (a Next build also generates it). The existing app
build downloads Google Fonts and requires network access; the standalone demo
uses system fonts.

The 3 notification tests cover this milestone independently of the growing repo
suite. Run the commands above to verify against the current integration branch.
The Vite preview returned HTTP 200 for its page, entry module, and component.
Screen-reader announcements are implemented with a live region and covered at
the DOM level; a manual screen-reader session has not been performed.
