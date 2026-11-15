// MongoDB connection. Server code only (route handlers, server components).
//
//   await connectDB();
//   const routines = await RoutineModel.find({ user_id: await getCurrentUserId() });

import mongoose from "mongoose";

// Turbopack can load separate Mongoose instances for a page and an API route.
// A promise for one instance cannot connect models registered on another.
const globalCache = globalThis as unknown as { bridgeMongoConnections?: WeakMap<typeof mongoose, Promise<typeof mongoose>> };
const connections = globalCache.bridgeMongoConnections ??= new WeakMap();

export function connectDB(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add your Atlas connection string to .env.local (see .env.example).");
  }

  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose);
  const existing = connections.get(mongoose);
  if (existing && mongoose.connection.readyState !== 0) return existing;
  const pending = mongoose.connect(uri, { dbName: process.env.MONGODB_DB || "bridge" });
  connections.set(mongoose, pending);
  // Keep only in-flight promises, so a later disconnect can reconnect.
  void pending.then(
    () => { if (connections.get(mongoose) === pending) connections.delete(mongoose); },
    () => { if (connections.get(mongoose) === pending) connections.delete(mongoose); },
  );
  return pending;
}
