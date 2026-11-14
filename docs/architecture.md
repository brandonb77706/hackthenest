# Architecture

Bridge is a Next.js app built in VS Code. Data lives in MongoDB Atlas. The app gets connected to Base44 later, and some features may use Base44 AI.

![System design whiteboard](whiteboards/3-system-design.jpg)

The whiteboard shows the first plan, where everything lived in Base44. The diagram below is the current plan.

```mermaid
flowchart TB
    subgraph App["Bridge app (Next.js, runs in the phone browser)"]
        RB["Routine builder<br/>goal to steps"]
        SP["Step player<br/>read out loud"]
        CH["Camera help<br/>photo to words"]
        HS["Help section<br/>lost mode, speak for me"]
        RW["Rewards<br/>tokens, avatars"]
    end
    subgraph Server["Server code (Next.js route handlers)"]
        AIL["AI layer, src/lib/ai<br/>one interface, swappable providers"]
        VO["Voice<br/>ElevenLabs calls"]
        MS["Messages and nudges"]
        TK["Token awards and purchases"]
    end
    subgraph Backend["Database"]
        DB["MongoDB Atlas<br/>via Mongoose"]
    end
    subgraph Outside["Outside services"]
        B44["Base44 AI and other AI providers"]
        EL["ElevenLabs"]
        NS["Notification service"]
        TC["Trusted contact"]
    end
    App -->|calls| Server
    App -->|reads and saves data| Backend
    TK --> DB
    AIL --> B44
    VO --> EL
    MS --> NS
    MS -->|only if the user allows| TC
```

## Layers

### App (frontend, Next.js)
| Screen | Does |
| --- | --- |
| Routine builder | User types or says a goal. Calls the AI layer, then image generation and ElevenLabs per step. Saves Routine and Steps. |
| Step player | Shows one step: picture, short text, audio. Buttons: Done, I'm stuck. Writes CheckIn. |
| Camera help | Upload or take a photo. Sends it to the AI layer. Shows and reads the explanation. Offers reminders for deadlines. |
| Help section | Lost mode (share location), speak for me, trusted contacts, 911 and 988 buttons. |
| Rewards | Token counter, avatar shop, my avatars, streak card. Token awards and purchases go through server code. |

### Server code (Next.js route handlers in `src/app/api/`)
Anything that holds a secret or must not be trusted to the browser runs here.

| Piece | Used for |
| --- | --- |
| AI layer (`src/lib/ai/`) | Every AI call: routines, camera help, stuck help, images. Providers (Base44 AI, OpenAI, others) sit behind one interface, and `models.ts` picks the provider per feature. |
| Voice | ElevenLabs text-to-speech. Audio is generated once and stored on the Step. |
| Messages | Trusted contact messages and location share links, only when the user turned sharing on. |
| Tokens | Awarding tokens when a CheckIn is saved as done, and avatar purchases. |
| Check-in nudges | Finding due steps with no CheckIn and sending a nudge. How it's scheduled is Nati's call (for example a cron route handler). |

### Database (MongoDB Atlas)
One shared Atlas cluster, used through Mongoose from server code only. Models live in `src/lib/db/models/`; see `data-model.md`.

- Users only read and write their own records. Every owned model has `user_id`, and a guard rejects any query that doesn't filter by it.
- **Login:** none yet. Everyone uses a fixed test user from `getCurrentUserId()` in `src/lib/db/currentUser.ts`. Real login replaces that one function later.
- **File storage** (step images, audio, bill photos): not decided yet. Don't store files in MongoDB documents.

### Outside services
| Service | Used for |
| --- | --- |
| Base44 AI and other AI providers | Text, JSON, vision, and image generation, through the AI layer only |
| ElevenLabs | All voice output |
| Notification service | Check-in nudges (in-app, Telegram, or email: Nati to decide) |
| Trusted contact | Gets a message only if the user turned sharing on |

## Connecting to Base44 later

Keep Base44 behind small wrappers so connecting it later doesn't touch feature code:
- AI calls go through `src/lib/ai/providers/base44.ts`.
- Data access goes through server code (`src/lib/db/`), never from Client Components.

## Demo mode

A `demo_mode` flag on UserProfile makes check-ins fire every 20 seconds from the frontend, so a live demo doesn't wait on real schedules.
