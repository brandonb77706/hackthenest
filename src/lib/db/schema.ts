// Shared pieces for every Mongoose model.

import mongoose, { Schema, Types, type SchemaDefinitionProperty, type SchemaOptions } from "mongoose";

/**
 * Schema fields for a type from src/lib/types.ts. Use with `satisfies` so a
 * field missing from the schema, or an extra one, is a type error.
 * `id` comes from Mongo's _id.
 */
export type Fields<T> = Record<Exclude<keyof T, "id">, SchemaDefinitionProperty>;

export const ObjectId = Schema.Types.ObjectId;

/** The owner field for every model a user owns. Pair it with ownedPlugin. */
export const ownerField = { type: ObjectId, required: true, index: true } as const;

/** "YYYY-MM-DD" */
export const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
/** "08:00" */
export const TIME_OF_DAY = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Turns a saved document into the plain shape from src/lib/types.ts. */
function toPlain(_doc: unknown, ret: Record<string, unknown>) {
  ret.id = String(ret._id);
  delete ret._id;
  for (const [key, value] of Object.entries(ret)) {
    if (value instanceof Types.ObjectId) ret[key] = value.toHexString();
    else if (value instanceof Date) ret[key] = value.toISOString();
  }
  return ret;
}

export const schemaOptions = {
  versionKey: false,
  toJSON: { virtuals: false, transform: toPlain },
  toObject: { virtuals: false, transform: toPlain },
} satisfies SchemaOptions;

/** Replace the schema without deleting the shared collection during a dev reload. */
export function defineModel<TSchema extends Schema>(name: string, schema: TSchema) {
  return mongoose.model(name, schema, undefined, { overwriteModels: true });
}

/** Converts a document to its type from src/lib/types.ts, e.g. toRecord<Routine>(doc). */
export function toRecord<T>(doc: { toJSON(): unknown }): T {
  return doc.toJSON() as T;
}
