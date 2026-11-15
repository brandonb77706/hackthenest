// Trusted contacts and saved messages. Server code only.

import { isValidObjectId } from "mongoose";
import { connectDB, SpeakPhraseModel, toRecord, TrustedContactModel } from "@/lib/db";
import type { ID, SpeakPhrase, TrustedContact } from "@/lib/types";
import type { ContactInput } from "./contactInput";

/** The messages a new person starts with, from the design. */
export const STARTER_PHRASES = [
  "I have autism. I need a moment to answer.",
  "I'm lost. Can you help me call my contact?",
  "Please write it down for me.",
  "I don't understand. Can you say it more simply?",
];

export async function listContacts(userId: ID): Promise<TrustedContact[]> {
  await connectDB();
  const docs = await TrustedContactModel.find({ user_id: userId }).sort({ _id: 1 });
  return docs.map((d) => toRecord<TrustedContact>(d));
}

/** addedBy is set when a guardian adds the contact for the user. */
export async function createContact(userId: ID, input: ContactInput, addedBy: ID | null = null): Promise<TrustedContact> {
  await connectDB();
  const doc = await TrustedContactModel.create({ user_id: userId, ...input, added_by: addedBy });
  return toRecord<TrustedContact>(doc);
}

export async function updateContact(userId: ID, id: string, input: ContactInput): Promise<TrustedContact | null> {
  if (!isValidObjectId(id)) return null;
  await connectDB();
  const doc = await TrustedContactModel.findOneAndUpdate({ user_id: userId, _id: id }, input, {
    returnDocument: "after",
    runValidators: true,
  });
  return doc ? toRecord<TrustedContact>(doc) : null;
}

export async function deleteContact(userId: ID, id: string): Promise<boolean> {
  if (!isValidObjectId(id)) return false;
  await connectDB();
  const result = await TrustedContactModel.deleteOne({ user_id: userId, _id: id });
  return result.deletedCount > 0;
}

/** The user's saved messages. A new person gets the starter messages the first time. */
export async function listPhrases(userId: ID): Promise<SpeakPhrase[]> {
  await connectDB();
  let docs = await SpeakPhraseModel.find({ user_id: userId }).sort({ order: 1, _id: 1 });
  if (docs.length === 0) {
    docs = await SpeakPhraseModel.create(STARTER_PHRASES.map((text, order) => ({ user_id: userId, text, order })));
  }
  return docs.map((d) => toRecord<SpeakPhrase>(d));
}

export async function createPhrase(userId: ID, text: string): Promise<SpeakPhrase> {
  await connectDB();
  const last = await SpeakPhraseModel.findOne({ user_id: userId }).sort({ order: -1 });
  const doc = await SpeakPhraseModel.create({ user_id: userId, text, order: (last?.order ?? -1) + 1 });
  return toRecord<SpeakPhrase>(doc);
}

export async function deletePhrase(userId: ID, id: string): Promise<boolean> {
  if (!isValidObjectId(id)) return false;
  await connectDB();
  const result = await SpeakPhraseModel.deleteOne({ user_id: userId, _id: id });
  return result.deletedCount > 0;
}
