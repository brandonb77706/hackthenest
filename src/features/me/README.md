# me

The Me tab (`/me`), from the "Bridge Mockups" design. Started by Adrian (`adrian-medesign`: the screen, `summary.ts` token and next-reward logic, and the Buddy drawings); finished on `brandon/all-designs`.

- **Header**: your Buddy, name, tokens, and Change Buddy.
- **Change Buddy**: the catalog from the database. Any starter Buddy can be picked (you then own it); shop and streak Buddies show locked with their price or streak. `PUT /api/me/buddy`.
- **Rewards**: tokens and progress to the next shop Buddy (Adrian's `nextReward`).
- **What your contacts can see**: each trusted contact's three sharing switches, saved to the contact.
- **Color scheme**: the 9 schemes from the design (`src/lib/theme.ts`, colors in `src/app/themes.css`). Changes the whole app right away. `PATCH /api/me/settings`.
- **Show my Buddy on the tab bar**: on/off. `PATCH /api/me/settings`.

The color scheme and Buddy are saved on the profile and copied to the device (`src/lib/settings.ts`) so every screen uses them right away and the scheme shows before the page paints.

Not built yet (nothing behind them): badges, levels, notification settings (Nati), sign-out (no accounts yet).
