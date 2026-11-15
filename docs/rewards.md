# Rewards: tokens, streaks, avatars

Owner: TBD (suggest Nati, since tokens are earned from check-ins).

Doing tasks and routines earns tokens. Tokens buy avatars in the shop. Streaks unlock exclusive avatars that can't be bought. The equipped avatar shows up as the guide in the step player and on the home screen.

## Why it's designed this way

The users are people with autism, ADHD, and intellectual disabilities, and many deal with anxiety. Typical game rewards punish failure, which can make someone feel worse or avoid the app. So:

1. **Never punish.** Tokens are never taken away. A broken streak doesn't remove avatars already earned.
2. **Help is not failure.** A step finished with stuck mode or camera help earns the same tokens. If help cost rewards, people would avoid the help button, which defeats the app.
3. **Forgiving streaks.** Each user holds up to 2 streak freezes. One is used automatically when a day is missed. Earn a new one every 7-day streak.
4. **No real money.** Tokens can't be bought. This keeps it fair and avoids taking advantage of vulnerable users.
5. **Calm celebration.** Short, kind animations with an option to turn off sound and motion.

## Earning tokens

| Action | Tokens |
| --- | --- |
| Finish a step | 5 |
| Finish a whole routine | 20 bonus |
| Use camera help to handle a letter or bill | 10 |
| First routine you ever finish | 50 one-time |
| Daily streak milestone (3, 7, 14, 30 days) | 25, 50, 100, 200 |

A "streak day" = at least one routine finished that day.

**Once per routine per day.** Each routine pays its step tokens and its bonus once a day, in the user's own time zone. Repeating a routine the same day is allowed (practice is good), but it earns nothing more. A different routine on the same day pays its own tokens, and the same routine pays again the next day. This stops tapping through a short routine over and over to farm tokens. The server decides all of this from saved check-ins; it never trusts the phone to say a routine was finished.

Code: `src/features/rewards/` (`earning.ts` amounts, `stepAwards.ts` the rules above, `service.ts` saves the tokens).

## Avatars

| Type | How you get it | Examples |
| --- | --- | --- |
| Starter | Free at signup, pick 1 of 3 | Fox, robot, cloud |
| Shop | Buy with tokens, 50 to 300 | Astronaut cat, chef bear, skater owl |
| Streak exclusive | Reach a streak length, can't be bought | 7 days: bronze star buddy; 14: silver dragon; 30: gold phoenix |

Generate the whole catalog ahead of time with image generation through the AI layer (prompt in `ai-prompts.md`) so the shop loads instantly. Keep 10 to 15 avatars for the hackathon.

## Data

See `data-model.md`: fields on UserProfile, plus `Avatar`, `UserAvatar`, `TokenTransaction`.

Rules:
- Every token change writes a TokenTransaction. The balance is the sum, so it can't drift.
- Buying an avatar checks the balance and writes a negative TokenTransaction and a UserAvatar together. Do this in server code (a route handler or backend function), not the browser, so users can't give themselves tokens.
- Award tokens in the same server code that saves a CheckIn with status `done`.

## Screens

1. **Token counter** in the header, with a small animation when tokens are earned.
2. **Avatar shop:** grid of avatars, price or "Unlock at 14-day streak," locked ones shown as silhouettes.
3. **My avatars:** tap to equip.
4. **Streak card on home:** current streak, freezes left, next unlock.

## Demo

Seed Jordan with a 6-day streak. When the volunteer finishes the routine on stage, it becomes a 7-day streak and the bronze star buddy unlocks live.
