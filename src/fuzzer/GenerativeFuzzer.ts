import { GenerativeFuzzingOptions, LLMProviderFn, LLMProviderRegistry } from '../types/index.js';

/**
 * GenerativeFuzzer bridges the Core Engine with external LLM providers to
 * produce generative, semantic fuzzing of string-typed scenario fields.
 *
 * Register custom providers via {@link GenerativeFuzzer.registerProvider}, then
 * call {@link GenerativeFuzzer.fuzz} to obtain LLM-generated text.
 */
export class GenerativeFuzzer {
  private readonly providers: LLMProviderRegistry;

  constructor() {
    this.providers = {};
  }

  /**
   * Registers a named LLM provider function.
   *
   * @param name - A unique provider identifier (e.g. 'openai', 'anthropic').
   * @param fn - An async function that accepts a prompt and returns generated text.
   *
   * @example
   * ```ts
   * fuzzer.registerProvider('openai', async (prompt) => {
   *   const res = await openai.chat.completions.create({ ... });
   *   return res.choices[0].message.content;
   * });
   * ```
   */
  public registerProvider(name: string, fn: LLMProviderFn): void {
    this.providers[name] = fn;
  }

  /**
   * Invokes the specified LLM provider with the given prompt.
   *
   * @param options - Fuzzing options including provider name and prompt.
   * @returns A promise resolving to the LLM-generated string.
   * @throws If the specified provider has not been registered.
   */
  public async fuzz(options: GenerativeFuzzingOptions): Promise<string> {
    const { provider, prompt, model } = options;
    const providerFn = this.providers[provider];
    if (!providerFn) {
      throw new Error(
        `LLM provider "${provider}" is not registered. ` +
          `Call registerProvider("${provider}", fn) first.`,
      );
    }
    return providerFn(prompt, model);
  }
}
