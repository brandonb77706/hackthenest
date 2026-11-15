# base44

Code that runs on Base44, not in our Next.js app. Copy it into the Base44 app editor.

## functions/invokeLLM.ts

Base44 blocks outside apps from calling `InvokeLLM` directly, so our server calls this backend function and the function calls the AI. Setup:

1. In the Base44 app, add a backend function named `invokeLLM` and paste in `functions/invokeLLM.ts`.
2. In the Base44 app's secrets, add `BRIDGE_FUNCTION_SECRET` with the same value as `BASE44_FUNCTION_SECRET` in your `.env.local`.
3. Publish the app.

If you change the function here, paste it into Base44 again and publish.
