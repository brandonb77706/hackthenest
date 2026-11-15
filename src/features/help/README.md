# help

Owner: George. Components, logic, and tests for this feature live here. See CLAUDE.md for the rules.

## The Help tab (`/get-help`), from the "Bridge Mockups" design

Built by Brandon on George's lost mode logic (`lostMode.ts`, `location.ts`).

- **Call {contact}**: the first trusted contact with a phone number. Every call asks first (`ConfirmCall`): nothing dials until "Yes, call".
- **I'm lost** (`LostMode`): calm steps right away, finds the location, then "Send my location to {name}" for contacts with lost alerts on. There's no messaging service yet, so Send opens the phone's texting or email app with the message filled in. Call 911 is always on this screen.
- **Speak for me** (`SpeakForMe`): type and Say it, Show big, Save as a message, and saved messages (tap to play, ✕ to remove).
- **Quick messages**: the first two saved messages.
- **Emergency**: Call 911 and Crisis line 988, each with a confirm.
- **Trusted contacts** (`ContactForm`): add, change, or remove. Every sharing setting starts off.

## API

| Route | Does |
| --- | --- |
| `GET/POST /api/contacts` | List or add trusted contacts |
| `PATCH/DELETE /api/contacts/<id>` | Change or remove one |
| `GET/POST /api/phrases` | Saved messages; a new person gets 4 starter messages |
| `DELETE /api/phrases/<id>` | Remove one |

## Still to do

- Stuck help ("I need help with this step" with the AI), using `src/lib/ai/prompts/stuckHelp.ts`.
- Sending lost alerts from the server (SMS/email service) instead of opening the phone's app.
- `/help` still shows George's first lost mode test page.
