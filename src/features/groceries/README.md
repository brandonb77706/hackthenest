# Grocery shopping

This local prototype searches Kroger's **production** catalog. Enter a five-digit
ZIP code, choose a store, search products, and add or remove items. Availability
and aisle information are displayed only when returned by Kroger. Missing values
are shown as unknown, with a phrase the user can read aloud for help. The list is
held in page memory and clears on reload or store change.

## Setup and demo

Add the following server-only values to `.env.local` (or `.env`):

```dotenv
KROGER_CLIENT_ID=your_client_id
KROGER_CLIENT_SECRET=your_client_secret
```

Never put credentials or access tokens in source, logs, or `NEXT_PUBLIC_` values.
Restart Next.js after changing them. From the repo root on Windows:

```powershell
npm.cmd ci
npm.cmd run dev
```

Choose **Grocery shopping** under Quick start on the Make Routine screen, or
open http://localhost:3000/groceries. For the verified example, search ZIP
`48197`, choose Kroger – Whittaker (location `01800707`), and search `rice`.
Use **View shopping list** to open the cart and remove items; hide it to continue searching.
Internet access and a Kroger production account with Locations and Products
access are required. Availability can change and is supplied by Kroger.

The app uses server-only client credentials and an in-memory, expiring token;
the browser receives only store and product data. The token is shared across
requests in one server process, but may be refreshed independently on other
instances. The standalone Vite preview under `demo/` still uses sample data.

## Team handoff

- Brandon owns the Make Routine screen (`src/features/routine-builder/components/Builder.tsx`); the
  requested Quick Start link to `/groceries` is a minimal change for his review.
- New Next.js wiring is in `src/app/groceries/page.tsx` and
  `src/app/api/groceries/{stores,products}/route.ts`; feature logic stays here.
  The server integration needs Brandon's review before production deployment,
  including access controls, rate limits, Kroger terms, and hosting secrets.
- George's Speak for Me UI is now present. This feature currently reuses the
  shared read-aloud button for the help phrase; coordinate future integration.
- There are no shared type changes. List persistence and saving this as a
  routine remain separate team decisions.
