# Bridge

**Support that's there when no one else is.**

Millions of people with autism, ADHD, or intellectual disabilities lose their daily support when school ends or a caregiver isn't around. Everyday tasks like taking medicine, getting ready for work, or reading a confusing bill can become real barriers.

Bridge is a phone app that fills that gap. It helps people do things on their own, and steps back as they grow more independent.

## Features

### Routines, made for you

Say or type what you need, like *"get ready for my 9am shift."* **Base44 AI** turns it into small, clear steps with times, and even works out when to start so you finish on time. Want smaller or bigger steps? One tap. Prefer to build it yourself, or use a quick start like *Take medicine* or *Bedtime*? That works too.

### One step at a time

The step player shows one step per screen, in big text, read out loud. Tap **Done** to move on, or **I need help** if you're stuck. Today shows what's next, what's done, and your progress.

### Scan any letter or bill

Take a picture of a letter, bill, or form. Bridge says what it is, what it means, what to do, and when it's due, out loud and on screen. **Walk me through it** turns the to-do list into steps. Photos stay private.

### Help in one tap

- **Call someone you trust**, with a confirm first so nothing dials by accident.
- **I'm lost** shows calm steps right away and sends your location to a trusted contact.
- **Speak for me** says what you type, or a saved message, out loud. Or shows it big on screen.
- **911 and 988** are always one tap away, each with a confirm.

### Made for every mind

- **9 color schemes** designed for different needs: autism, ADHD, Down syndrome, dyslexia, epilepsy (no motion), color blindness, sensory sensitivity, and high contrast for low vision.
- Big buttons, plain language, and a readable font made for low vision.
- Every step and message can be read aloud.
- A friendly **fox Buddy** gives tips on every screen.

### You're in control

Trusted contacts only see what you choose, and every sharing setting starts **off**. Bridge is support, not monitoring.

## Built with

Next.js · Base44 AI · MongoDB Atlas · ElevenLabs voice

## Challenges we ran into

- **Getting Base44 AI into our own app.** Base44 blocks outside apps from calling its AI or uploading files directly. We built a Base44 backend function, protected by a shared secret, that does both for us.
- **Keeping photos private.** Bills and letters are personal, so each scan is stored as a private file that the AI reads through a link that expires in five minutes.
- **Never letting the AI guess.** The AI sometimes returned too many steps, or dates in odd formats. Every answer is checked before anyone sees it: real dates are cleaned up, and anything unclear is dropped instead of guessed.
- **Making voice reliable.** Phones and browsers fail at speech in quiet ways: long text that never plays, voices locked behind paid plans, and iPhones muted by the silent switch. We built fallbacks so Bridge always has a voice.
- **Testing on real phones.** Notifications on iPhone need an installed app and HTTPS, and the dev server blocked phones at first. We chose in-app check-ins for now and set up secure tunnels so the whole team could test on their own phones.
- **Four people, one app.** We split the work by feature and used a simple branch → dev → main flow so everyone could build at the same time without breaking each other's work.

## Accomplishments that we're proud of

- **It really works.** Bridge turns a sentence into a routine in about 2 seconds and explains a photographed bill in about 4.
- **Accessibility from the start, not added at the end.** Every screen has big tap targets, plain words and read-aloud, and works across 9 color schemes, including high contrast and a no-motion mode for epilepsy.
- **Safety by design.** Nothing dials without a confirm, 911 and 988 are always one tap away, and sharing is off until the user turns it on.
- **Help never counts as failure.** Asking for help is built into every step, never hidden or penalized.
- **Built to last.** More than 450 automated tests cover routines, scanning, help, safety rules and privacy defaults.

## What we learned

- Designing for disability means designing for clarity: one action per screen, short sentences, and always a way out.
- AI is only helpful when it's trustworthy. Checking its answers mattered as much as writing the prompts.
- Real devices tell the truth. Many of our biggest bugs only showed up on an actual phone.
- Independence is the goal. The best support knows when to step back.

## What's next for Bridge

- **Stuck help:** an AI helper that talks someone through a hard step, one small action at a time.
- **Reminders that come to you:** check-ins and nudges, including notifications when the app is closed.
- **Rewards:** tokens, streaks, badges and new Buddies for finishing routines.
- **A trusted contact app:** family and job coaches can add routines and get alerts, only with permission.
- **Support that fades:** an independence score that suggests bigger steps as people need less help.
- **Real-world modes:** guided help for the bus, the doctor's office and the grocery store.
