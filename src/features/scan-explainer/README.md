# Scan explanations

After scanning an image, select **Show animated explanation**. Bridge presents
the existing AI result as animated scenes: what the document is, its summary,
any reading uncertainty, actions, and each recognized date. Select the speaker
button to hear each scene, then use Next or Back. The user controls the pace;
this is an interactive animated presentation, not an exported video file.
Reduced-motion settings disable the scene animation.

The scan uses Gemini when `GEMINI_API_KEY` is configured; otherwise it uses
the configured Base44 provider. It reports an error instead of displaying a
sample answer when neither is configured. Voice uses
the shared player: browser speech in development, or ElevenLabs where configured,
with browser fallback. The scene view sends no additional image or text to another AI.
It presents the scanner's output and cannot verify that the scan is correct;
users should check the original document and seek appropriate help for important
financial, medical, or legal decisions.

## Generated video demo

On a scan result, review the explanation, then choose **Create video explanation**.
Bridge sends that scan interpretation to Gemini to create a scene prompt and
duration, then asks Gemini Omni Flash to make the 360p video. The image is not
sent again. The user chooses **Send picture and create video** before this request.
The video returns without Bridge saving the image or video. The
page shows the clip alongside the exact scan result and read-aloud control. The
generated animation is a visual aid; check the original document for important
information.

Gemini chooses a duration from 3 to 10 seconds based on the explanation.
Google limits an individual generation to 10 seconds. A 30 second explanation
would need separate extension requests and handling for their additional cost,
time, storage, and possible inconsistencies.

For local development, set `GEMINI_API_KEY` in the root `.env` or `.env.local`
and run `npm run dev`. Production requests are disabled unless
`GEMINI_VIDEO_EXPLANATIONS_ENABLED=true`; add authentication and rate limiting
before enabling this paid endpoint on a public deployment.

The video request is feature-local because the shared AI provider interface
currently supports text and JSON, not video. Coordinate with Brandon before
moving this transport into the shared AI layer. The scan screen integration is
in Adrian's camera-help area and should be reviewed with Adrian before merging.

The integration changes Adrian's `src/features/camera-help/components/ScanScreen.tsx`;
coordinate review with the camera-help owner. Shared AI prompts, model selection,
and types were not changed. No scene or image is saved by this feature.
