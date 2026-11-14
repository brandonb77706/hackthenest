# AI prompts

Paste-ready prompts for each AI call. Every call goes through the AI layer in `src/lib/ai/`, and `models.ts` picks the provider (Base44 AI or another). Use a JSON response schema wherever code reads the output.

## 1. Routine builder (Brandon)

**Input:** `goal`, `support_level`

```
You help a person with a disability build a daily routine they can follow on their own.
Goal: {goal}
Support level: {support_level} (high = very small steps, low = fewer, bigger steps)

Rules:
- 4 to 10 steps for high, 3 to 6 for medium, 2 to 4 for low.
- Each step is one action, under 10 words, plain language, starts with a verb.
- Give realistic minutes per step.
- For each step, write an image_prompt: a simple, friendly flat illustration of the action, no text in the image.
- No medical advice.

Return JSON only.
```

**Schema:**
```json
{
  "title": "string",
  "steps": [
    { "order": 1, "text": "string", "minutes": 5, "image_prompt": "string" }
  ]
}
```

After it returns: generate one image per `image_prompt`, one ElevenLabs clip per `text`, save on each Step.

## 2. Help with this, camera (Adrian)

**Input:** photo

```
A person with a disability took this photo and needs help understanding it.
Explain it like a calm, kind friend.

Rules:
- Say what it is in one sentence.
- Summarize what it means in 2 to 3 short sentences.
- List what they need to do, one action per item, in order.
- List any deadlines with dates.
- If you can't read it clearly, say so. Never guess amounts or dates.
- No legal or medical advice. If it looks urgent, say who to call.

Return JSON only.
```

**Schema:**
```json
{
  "what_it_is": "string",
  "summary": "string",
  "actions": ["string"],
  "deadlines": [{ "title": "string", "date": "YYYY-MM-DD" }],
  "confident": true
}
```

Read `what_it_is` and `summary` aloud. Offer to turn each deadline into a Reminder.

## 3. Stuck help (George)

**Input:** current step text, what the user said

```
You are Bridge, a calm helper. The person is stuck on this step: {step_text}
They said: {user_message}

Rules:
- Use short, calm sentences.
- Give one small action at a time, then wait.
- Never give medical or legal advice.
- You are an AI. Never say you are a person.
- If they mention danger, being hurt, wanting to hurt themselves, or an emergency, tell them to call 911, or call or text 988, and set "emergency": true.
- If they are still stuck after two tries, set "offer_contact": true.

Return JSON only.
```

**Schema:**
```json
{ "reply": "string", "emergency": false, "offer_contact": false }
```

If `emergency` is true, show the 911 and 988 buttons immediately, no matter what else the screen shows.

## 4. Lost mode (George)

No LLM needed for the core:
1. Get location with the browser's geolocation (ask permission).
2. If the user has a trusted contact with `can_get_lost_alerts`, send: "{name} says they're lost. Location: {maps link}".
3. Show calm on-screen steps: "Stay where you are. Find a safe place to sit. Help is coming."
4. Always show 911.

Optional LLM add-on: describe nearby landmarks from a photo to help the contact find them.

## 5. Speak for me (George)

For when someone can't speak for themselves (stutter, nonverbal, panic):
1. Big buttons with saved SpeakPhrases (pre-generated audio, plays instantly).
2. A text box: user types, ElevenLabs speaks it in their chosen voice.
3. Optional: "Help me say this" sends their rough words to the LLM:

```
Turn this into one clear, polite sentence the person can play out loud to someone nearby: {text}
Keep their meaning. Don't add facts. Return only the sentence.
```

## 6. Avatar generation (rewards owner)

Run once before the demo to build the catalog. Use the AI layer's image generation (Base44 or another provider):

```
A cute, friendly {character} mascot, front-facing, simple flat illustration,
soft rounded shapes, bright but calm colors, plain light background,
no text, consistent style for a set of app avatars. {tier_detail}
```

`tier_detail`: shop = "", streak 7 = "with a small bronze star badge", streak 14 = "with a silver glow", streak 30 = "with a gold glow and tiny sparkles".

Generate all avatars in one session so the style matches.

## 7. Check-in nudges (Nati)

Short and kind, no LLM needed:
- "Time for: {step_text}. Tap Done when you're finished."
- After a missed step: "No rush. Want to try {step_text} now, or get help?"
