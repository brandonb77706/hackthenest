# CLAUDE.md

Context for Claude when working in this repo. Read this first, then the doc in `docs/` that matches the task.

@AGENTS.md

## Project

Bridge is a hackathon app (track: "Best use of Base44 AI", community vote). It gives AI support to people with disabilities who don't have a parent, aide, or caregiver around: routines, paperwork, help when lost or stuck, and rewards for doing tasks. Support fades as independence grows.

| Doc | What's in it |
| --- | --- |
| `README.md` | Product overview and features |
| `docs/architecture.md` | How the parts connect |
| `docs/data-model.md` | Entities and fields |
| `docs/ai-prompts.md` | Prompts and JSON shapes for every AI call |
| `docs/rewards.md` | Tokens, streaks, avatars |
| `docs/team.md` | Ownership and timeline |

## Stack

- **Frontend:** Next.js (App Router, TypeScript, Tailwind). This is a recent Next.js version, so check `node_modules/next/dist/docs/` before using an API you're unsure of (see AGENTS.md).
- **Database:** MongoDB Atlas through Mongoose, from server code only. Models are in `src/lib/db/models/`, and every query on an owned model must filter by `user_id` (a guard enforces it). Login is Better Auth (`src/lib/auth/`): use `getCurrentUserId()` for the signed-in user, never a hardcoded id. `npm run db:seed` creates the demo logins (see `scripts/seed.ts`).
- **Other backend pieces** (file storage, scheduling) aren't decided. When a task needs one of those choices, ask instead of picking one.
- **AI:** Base44 AI plus other providers. Every AI call goes through `src/lib/ai/` (below), so providers can be swapped without touching features.
- **Voice:** ElevenLabs, called from server-side code only.
- **Later:** the app is built in VS Code first and connected to Base44 after the features work. Keep Base44 behind wrappers (`src/lib/ai/providers/base44.ts`, data helpers in `src/lib/`) so connecting it doesn't touch feature code.

## Repo patterns

```
src/
  app/                  routes (one folder per screen)
  components/           shared UI (accessible buttons, cards, layout)
  components/bridge/    the design: icons, Buddy, tab bar, switch, shared styles
  app/themes.css        the 9 color schemes (lib/theme.ts lists them)
  features/<feature>/   feature logic, components, and tests together
  lib/ai/               AI layer: providers, model config, prompts
  lib/db/               MongoDB: connection, models, current user
  lib/                  other shared helpers
docs/                   project docs
```

1. **Feature folders.** Each owner's work lives in `src/features/<feature>/` (`home`, `routine-builder`, `step-player`, `camera-help`, `help`, `me`, `notifications`, `rewards`). Keep its components, logic, and tests there.
2. **Logic separate from UI.** Put rules (streak math, token awards, routine validation, independence score) in plain TypeScript functions, not inside components, so they're easy to unit test.
3. **Server vs client.** Anything holding a secret (AI provider keys, ElevenLabs) runs server-side: route handlers in `src/app/api/` or backend functions. Never put a secret in a `NEXT_PUBLIC_` variable or a Client Component.
4. **Types first.** Shared types (Routine, Step, CheckIn, etc.) live in `src/lib/types.ts` and match `docs/data-model.md` and the models in `src/lib/db/models/`.

## AI layer (`src/lib/ai/`)

- `providers/`: one file per provider (for example `base44.ts`, `openai.ts`), each implementing the same interface:
  ```ts
  export interface AIProvider {
    generateText(input: { prompt: string; files?: string[] }): Promise<string>;
    generateJSON<T>(input: { prompt: string; schema: object; files?: string[] }): Promise<T>;
  }
  ```
- `models.ts`: the only place that says which provider and model each feature uses:
  ```ts
  export const AI_CONFIG = {
    routineBuilder: { provider: 'base44', model: '...' },
    cameraHelp:     { provider: 'base44', model: '...' },
    stuckHelp:      { provider: '...',    model: '...' },
  } as const;
  ```
- `prompts/`: prompt builders, one per feature, copied from `docs/ai-prompts.md`.
- Features call `ai.forFeature('routineBuilder').generateJSON(...)` and never call a provider directly.
- Use structured JSON output whenever code reads the result, and check the shape before saving.
- Base44 AI (`providers/base44.ts`): Base44 blocks outside apps from calling `InvokeLLM` directly, so our server calls the Base44 backend function `invokeLLM` (source in `base44/functions/invokeLLM.ts`), which calls `InvokeLLM` with the service role. It needs `NEXT_PUBLIC_BASE44_APP_ID` and `BASE44_FUNCTION_SECRET` (must match `BRIDGE_FUNCTION_SECRET` in Base44). If you change the function, paste it into Base44 and publish. Model `"default"` uses the Base44 app's setting; to pin one, pick from the list in `node_modules/@base44/sdk/dist/modules/integrations.types.d.ts`. Read that list instead of guessing.
- A feature set to `"base44"` uses the mock when no Base44 app id is set, so the app runs without Base44. Calls use the Base44 app's shared AI credits.

## Testing

Every piece of logic ships with unit tests, and Claude confirms they pass before calling a task done.

- **Tools:** Vitest and React Testing Library. Run them with `npm test`.
- **Location:** next to the code, `thing.ts` paired with `thing.test.ts`.
- **What to test:** all logic functions (streaks, tokens, scheduling, score, validation), AI response parsing (valid, malformed, and missing fields), and key UI behavior (Done and I'm stuck buttons, emergency buttons appear).
- **Mock AI and network calls** in tests. Tests never hit a real AI provider, Base44, ElevenLabs, or MongoDB. Model tests use `doc.validate()` and `toRecord()`, which don't need a connection.
- **Safety tests are required:** stuck help input mentioning danger must show 911 and 988; sharing settings default to off; using help never reduces tokens.

**Definition of done for any task:**
1. Tests written or updated for the change.
2. `npm test` passes. Show the summary line.
3. `npm run lint` and `npx tsc --noEmit` pass.
4. `npm run build` passes if the change touches routes or config.
5. If something fails, fix it or say clearly what's still failing. Never report a task as done with failing tests.

## Team ownership

| Person | Owns |
| --- | --- |
| Brandon | Data model, AI layer, routine builder, moving `dev` into `main` |
| Adrian | Frontend: step player, home screen, accessibility, large text; camera help (confirm) |
| Nati | Notifications: check-ins and nudges; rewards (suggested, confirm) |
| George | Help section: lost mode, speak for me, trusted contacts, 911 and 988 |

Only change files in the current person's area. Flag anything that touches someone else's area, and ask Brandon before changing shared types or the AI layer.

## Product rules

1. **Accessibility first.** 18px minimum body text, high contrast, one main action per screen, 48px minimum tap targets, real `<button>` and `<label>` elements, works with a screen reader.
2. **User is in control.** Nothing goes to a trusted contact unless the user turned it on. Every sharing setting defaults to off.
3. **Safety.** The AI never gives medical or legal advice. Any mention of danger, self-harm, or emergency shows 911 and 988 right away. The AI never pretends to be a human.
4. **Plain language.** All AI text for users uses short sentences, one action at a time, and no jargon.
5. **Rewards never punish.** Tokens are never removed, help earns the same tokens, streaks have freezes, and there are no real-money purchases. Token changes happen server-side only.
6. **Demo assets.** Pre-generate demo images and audio. If ElevenLabs fails, fall back to the browser's `speechSynthesis`.
7. **Secrets** live in `.env.local` (gitignored) or the backend's secret store. Never commit keys.

## Git

Three levels: your branch → `dev` → `main`.

| Branch | Who changes it | What it is |
| --- | --- | --- |
| `<name>/<feature>` (e.g. `adrian/step-player`) | Its owner | Your work in progress |
| `dev` | Everyone, by merging their branch in | Everyone's finished work, together |
| `main` | Brandon only | The version that works for the demo |

**Getting your work into `dev`:**
1. Commit to your own branch and push it: `git push origin <name>/<feature>`.
2. Merge the latest `dev` into your branch: `git fetch origin && git merge origin/dev`. Fix any conflicts on your branch, never on `dev`.
3. Make sure it all works: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, and try your feature with `npm run dev`. Push your branch again.
4. When everything is good, merge your branch into `dev` and push: `git checkout dev && git pull && git merge <name>/<feature> && git push origin dev`.

**Rules:**
- Never commit directly to `dev` or `main`. Work happens on your branch.
- Never push to `main`. Brandon moves `dev` into `main` when `dev` is stable.
- If `dev` breaks after your merge, fix it on your branch and merge again.
- Small commits with clear messages.
- Never add Claude as a commit author or co-author in any form. No `Co-Authored-By` lines.

For Claude: when asked to "merge into dev," follow steps 2 to 4 above, and stop and report if any check fails instead of merging. Only merge `dev` into `main` when Brandon asks.
