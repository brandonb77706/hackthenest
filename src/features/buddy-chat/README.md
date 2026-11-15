# Buddy chat

Tap Buddy on the tab bar, then choose **Chat with Buddy**. Messages and an aggregate summary of the signed-in user's completed step check-ins over the last seven days are sent to Gemini. Bridge does not save chat messages. The summary counts steps and UTC calendar days with activity, not completed routines or missed days. No conversation history is sent, so each question is answered independently.

Set `GEMINI_API_KEY` in `.env.local` or `.env`. MongoDB and sign-in must be configured. The server uses the signed-in user ID for every database query. The chat uses a feature-local Gemini call; coordinate with Brandon before moving it into the shared AI provider layer. The Buddy entry point changes Adrian's shared tab bar and needs his review.

The emergency phrase check is limited and cannot detect every crisis. Review safety handling, access controls, rate limits, provider data retention, and accuracy with the team before deployment.
