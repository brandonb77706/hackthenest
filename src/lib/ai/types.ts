export interface TextInput {
  prompt: string;
  /** Public URLs of images or files to send with the prompt */
  files?: string[];
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
