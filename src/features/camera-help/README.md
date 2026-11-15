# camera-help

The Scan tab (`/scan`): take a picture of a letter, bill, or form, and Bridge explains it out loud and on screen. Owner: Adrian (confirm). Built by Brandon from the "Bridge Mockups" design.

- The browser shrinks the photo (`compressImage.ts`: 1600px, JPEG) and sends it to `POST /api/scan`.
- `scan.ts` asks the AI with the camera help prompt (`src/lib/ai/prompts/cameraHelp.ts`), checks the answer, and asks once more if it's bad.
- The Base44 `invokeLLM` function stores the photo as a private file; Bridge doesn't save it.
- Result: what it is, a summary, "What to do", the first deadline as "Important · due ...", Read it to me, Walk me through it (the step player, saving nothing), and Scan another.
- Not built yet: turning deadlines into Reminders, and camera tokens (a marked spot in the route, for Nati).
