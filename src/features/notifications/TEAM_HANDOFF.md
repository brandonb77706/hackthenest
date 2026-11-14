# Nati: manual check-in notification milestone

Bridge now has an in-app check-in demo plus a real Web Push test. Users explicitly
enable notifications, export their browser's subscription, close the Bridge tab,
and receive a generic **Bridge check-in** notification sent by a local Node script.
Clicking the notification opens `/notifications/test`. Nati confirmed desktop
Chrome delivery and reported the Android Chrome flow through an HTTPS tunnel worked.

This is a delivery prototype, not scheduled check-ins. There is no public send
endpoint, database subscription storage, scheduler, email delivery, or production
hosting. A local Node process is the sender; the browser vendor transports pushes.
The existing in-app demo still works and is shown on the same test page.

## Test on Windows desktop

After syncing your feature branch with `origin/dev`, run from the repo root:

```powershell
npm.cmd ci
npx.cmd web-push generate-vapid-keys
```

Create a gitignored `.env` in the repo root, or add these values to your existing
one. Copy the matching public/private pair from that command:

```dotenv
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_generated_public_key
VAPID_PRIVATE_KEY=your_generated_private_key
VAPID_SUBJECT=mailto:your-email@example.com
```

Generate once per developer setup and reuse the pair. Keep the private key out of
Git, chat, screenshots and shared docs. The email is a sender contact, not an email
notification recipient. `PUSH_TEST_TOKEN` is not needed. Avoid conflicting VAPID
values in `.env.local` or shell variables; the sender explicitly reads `.env`.

```powershell
npm.cmd run dev -- --hostname localhost --port 3000
```

Open http://localhost:3000/notifications/test in a normal Chrome or Edge window
(not VS Code's embedded preview). Click **Enable notifications**, allow permission,
and click **Copy test subscription**.

Save the JSON to `.local/push-subscription.json`. To avoid overwriting your
clipboard, paste the following command into a second PowerShell terminal BEFORE
clicking Copy test subscription; then return to the terminal and press Enter:

```powershell
New-Item -ItemType Directory -Force .local | Out-Null
Get-Clipboard -Raw | Set-Content -LiteralPath .local/push-subscription.json -Encoding utf8
```

Alternatively, paste the subscription directly into that file in your editor.
The subscription is private and `.local/` is gitignored. Then close only the Bridge
tab, leave another browser tab open, and keep the dev server running:

```powershell
npm.cmd run push:test
```

Look for **Bridge check-in** in Windows notifications (Win+N). Click it and verify
Bridge reopens. "Push service accepted" means transport acceptance; visually
confirm arrival. Internet access is required even when Bridge runs locally.

## Android Chrome via a temporary tunnel

See the detailed [tunnel instructions](README.md#temporary-android-chrome-tunnel).
Build with `$env:NEXT_PUBLIC_PUSH_TUNNEL_TEST='true'`, run the production test server
on localhost:3002, the restricted proxy on 127.0.0.1:3003, and Cloudflare's tunnel
pointed at port 3003. Open its HTTPS URL plus `/notifications/test` in Android Chrome.

The phone has a separate subscription: transfer it privately to the laptop's
`.local/push-subscription.json` before sending. A new tunnel URL requires enabling
notifications again for that new origin. Keep the laptop awake and the processes
running. Stop the tunnel when done. iPhone setup has not been implemented/tested.

## Handoff and checks

- Feature logic, worker source, sender, proxy and tests live under
  `src/features/notifications/`.
- Shared wiring: `src/app/notifications/test/page.tsx`,
  `src/app/notifications/sw.js/route.ts`, `package.json`, lockfile, `.gitignore`,
  and `.env.example`. No shared types changed.
- Worker scope is `/notifications/`; it does not cache pages or intercept fetches.
- The optional tunnel proxy exposes only the test page, worker, favicon and static
  build assets. It blocks app APIs and writes.
- Automated: 28 test files / 186 tests passed, lint, TypeScript and build passed.
  Tests include native Node import compatibility, subscription handling, worker
  click behavior and tunnel route restrictions; push transport is mocked.
- Before production, coordinate with Brandon on authenticated delivery, durable
  subscription storage and scheduling, and Adrian on actual app UI/route placement.
  Phone delivery on a permanent HTTPS origin is a later integration milestone.
