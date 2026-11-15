export interface ImageInput {
  /** Base64 bytes, without a "data:" prefix */
  data: string;
  mime: "image/jpeg" | "image/png" | "image/webp";
}

export interface TextInput {
  prompt: string;
  /** Public URLs of images or files to send with the prompt */
  files?: string[];
  /** Photos sent with the prompt. Providers store them privately before the AI reads them. */
  images?: ImageInput[];
}

export interface JSONInput extends TextInput {
  /** JSON schema for the response */
  schema: object;
}

/** Every provider implements this. Features never call a provider directly. */
export interface AIProvider {
  generateText(input: TextInput): Promise<string>;
  /**
   * Returns the provider's JSON unchecked. Always run it through the
   * feature's parse function (in prompts/) before using or saving it.
   */
  generateJSON<T = unknown>(input: JSONInput): Promise<T>;
}

export type ProviderName = "mock" | "base44";
