// MongoDB connection. Server code only (route handlers, server components).
//
//   await connectDB();
//   const routines = await RoutineModel.find({ user_id: await getCurrentUserId() });

import mongoose from "mongoose";

// Next.js reloads modules in dev. Keeping the connection on globalThis stops
// every reload from opening a new connection to Atlas.
const cache = globalThis as unknown as { bridgeMongo?: Promise<typeof mongoose> };

export function connectDB(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add your Atlas connection string to .env.local (see .env.example).");
  }

  cache.bridgeMongo ??= mongoose
    .connect(uri, { dbName: process.env.MONGODB_DB || "bridge" })
    .catch((error: unknown) => {
      // Let the next call try again instead of keeping a failed connection.
      cache.bridgeMongo = undefined;
      throw error;
    });

  return cache.bridgeMongo;
}
