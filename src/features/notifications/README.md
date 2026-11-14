# notifications

Owner: Nati. Components, logic, and tests for this feature live here. See CLAUDE.md for the rules.

## Delivery decision

Production delivery remains open. The original demo uses local React state;
the desktop test below uses standards-based Web Push with the `web-push` Node
library. No Postmark or hosted notification vendor is configured.

## Try the standalone demo

From the repository root (use `npm`/`npx` instead of `.cmd` outside Windows):

```powershell
npm.cmd ci
npx.cmd vite --config src/features/notifications/demo/vite.config.mts
```

Vite is already included by the locked Vitest tooling.
Open http://127.0.0.1:5173. Click **Send test check-in**, or Tab to it and press
Enter. A morning routine reminder appears and is announced politely by screen
readers. Send again to increment its number. **Dismiss check-in** clears the
reminder; refresh resets the demo. Stop the server with Ctrl+C.

The demo needs no keys, account, browser notification permission, or external
service. Dependencies must be installed first. Nothing goes to trusted contacts;
there is no sharing control or contact transport. No persistence, scheduled
delivery, CheckIn record, or token mutation occurs. A nudge is distinct from the
shared `CheckIn` entity, which records a done/skipped/stuck response.

## Integration handoff

Adrian/Brandon can import and render the component in a Next.js page:

```tsx
import { CheckInDemo } from "@/features/notifications/CheckInDemo";

export default function Page() {
  return <CheckInDemo />;
}
```

The localhost test page now mounts both demos at `/notifications/test`. The
standalone preview still works independently. No shared types have changed.

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

## Local desktop web push (Windows, Chrome or Edge)

Run commands in PowerShell from the repository root. Node 22 is supported.
This test uses localhost, which browsers treat as a secure context. Use the exact
same browser, hostname and port throughout; `127.0.0.1` is a different origin.
Internet access is required for the browser vendor's push service, even though
Bridge runs locally. A manifest and phone installation are not part of this test.

1. Install dependencies:

   ```powershell
   npm.cmd ci
   ```

2. Fill the existing, gitignored `.env`:

   ```dotenv
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key
   VAPID_PRIVATE_KEY=your_matching_private_key
   VAPID_SUBJECT=mailto:your-email@example.com
   ```

   If you do not already have a matching pair, run `npx.cmd web-push generate-vapid-keys`
   in your own terminal and paste the pair into `.env`. Generate once, not per send.
   Do not share the private key. `PUSH_TEST_TOKEN` from the earlier template is
   unused: there is no send endpoint. The sender reads `.env`; avoid conflicting
   VAPID values in `.env.local` or your shell, since Next.js can prefer those.
   Restart Next.js after changing a public key.

3. Terminal 1:

   ```powershell
   npm.cmd run dev -- --hostname localhost --port 3000
   ```

   If port 3000 is occupied, stop that server first. Leave Terminal 1 running.
   Open **http://localhost:3000/notifications/test** in desktop Chrome or Edge.
   Click **Enable notifications**, then **Allow** in the browser permission prompt.
   Nothing requests permission on page load. An existing matching subscription
   is reused. The original **Send test check-in** button below remains in-page only.

4. Click **Copy test subscription**. In Terminal 2, save the clipboard:

   ```powershell
   New-Item -ItemType Directory -Force .local | Out-Null
   Get-Clipboard -Raw | Set-Content -LiteralPath .local/push-subscription.json -Encoding utf8
   git check-ignore .env .local/push-subscription.json
   ```

   Both paths should be listed as ignored. Keep this JSON private; it identifies
   the device's push destination. If clipboard access fails, select all text in
   the subscription box and copy it manually before running the same commands.

5. Close the Bridge tab. Keep Chrome/Edge running (leave another unrelated tab
   open), and keep the Bridge dev server running. Then in Terminal 2:

   ```powershell
   npm.cmd run push:test
   ```

6. Look for **Bridge check-in** in Windows notifications. Click it. It should open
   **http://localhost:3000/notifications/test**. Confirm the original in-app demo
   still works there. This is the actual desktop acceptance check.

The sender sends exactly once, with a 60-second TTL and a fixed generic payload.
"Push service accepted" is not proof of desktop delivery. If nothing appears,
check Windows Settings > System > Notifications, Do not disturb, and the browser's
localhost notification permission. Check Notification Center if the banner was
hidden. Do not fully exit or force-stop the browser during this test.

If a subscription expires or you change VAPID keys, clear localhost site data
in browser settings, reload the test page, enable notifications again, and replace
the JSON file. To clean up, revoke localhost notification permission and clear its
site data (including service workers); remove the local JSON file when finished.

### Shared wiring and limits

- `src/app/notifications/test/page.tsx` mounts both demos; coordinate route/UI
  placement with Adrian before exposing it elsewhere.
- `src/app/notifications/sw.js/route.ts` serves the feature's JavaScript worker on
  localhost only, with `no-store`. Scope is `/notifications/`, not the whole app.
  There is no fetch handler, offline cache, or public send API.
- `package.json`/lockfile add `web-push` and the local `push:test` command.
- `.gitignore` excludes `/.local/`; `.env.example` documents VAPID settings.
- Brandon should review those dependency/config changes. No shared types, database,
  scheduler, hosting, production storage, or phone setup was added.
- Feature logic, worker source, local sender, and tests stay in this folder.

Automated tests mock push delivery and cover permission denial, subscription reuse,
key changes, clipboard export, sender validation, fixed content, worker click
handling, and the existing in-app demo. Desktop notification arrival and clicking
the real OS notification must be verified manually using steps 5–6.

Verification including tunnel support: 28 test files passed, 186 tests passed;
lint, route type generation, TypeScript, production build, and `git diff --check`
passed. The Next.js page and worker returned HTTP 200; the page contains both
demo triggers and the worker has JavaScript content type and `no-store` headers.
Automated checks do not send to real devices. Nati separately confirmed desktop
Chrome delivery and reported the Android Chrome tunnel flow worked. These are
manual observations, not automated end-to-end coverage.

## Temporary Android Chrome tunnel

The optional `NEXT_PUBLIC_PUSH_TUNNEL_TEST=true` build flag permits HTTPS
`*.trycloudflare.com` origins as well as localhost. Keep using the same VAPID keys.
This is a temporary Android Chrome test, not production deployment or iPhone setup.
The tunnel uses a restricted proxy: only `/notifications/test`, its worker,
favicon and `/_next/static/` assets are exposed. All other paths and write requests
are blocked; there is no send endpoint. The tunnel URL is publicly reachable, so
keep it private and stop the tunnel when done.

With Cloudflare's official `cloudflared.exe` downloaded into ignored `.local/`, run
from the repo root in separate PowerShell terminals:

```powershell
# Build once; stop any Next dev server before building if it is using .next.
$env:NEXT_PUBLIC_PUSH_TUNNEL_TEST='true'
npm.cmd run build
npm.cmd run start -- --hostname localhost --port 3002
```

```powershell
node src/features/notifications/tunnel-proxy.mjs
```

```powershell
.\.local\cloudflared.exe tunnel --url http://127.0.0.1:3003 --no-autoupdate
```

Open the printed HTTPS URL with `/notifications/test` appended on Android Chrome.
Tap Enable notifications and allow it. The phone creates a different subscription
from your desktop. Copy that JSON privately to the laptop's ignored
`.local/push-subscription.json` before running `npm.cmd run push:test` (this replaces
the desktop test target). Do not post it in chat or commit it. Close the phone's
Bridge tab before sending; tap the notification to reopen the tunnel test page.

Keep all three terminals running. Stop each with Ctrl+C when finished. Quick
tunnel URLs change after restarting, so enable and save a new phone subscription
for the new origin. A later normal build without the flag restores localhost-only
client behavior. No secrets or subscriptions are stored by the proxy.
