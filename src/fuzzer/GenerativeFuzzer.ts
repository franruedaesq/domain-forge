import {
  GenerativeFuzzingOptions,
  ILLMProvider,
  LLMProviderFn,
  LLMProviderRegistry,
} from '../types/index.js';

/**
 * Error thrown when an LLM provider call exceeds the configured timeout
 * and no fallback value has been specified.
 */
export class FuzzerTimeoutError extends Error {
  constructor(provider: string, timeoutMs: number) {
    super(`LLM provider "${provider}" timed out after ${timeoutMs}ms.`);
    this.name = 'FuzzerTimeoutError';
  }
}

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
   * Registers a named LLM provider.
   *
   * Accepts either a plain async function or an object implementing
   * {@link ILLMProvider}, so any LLM client can be injected without
   * introducing hard SDK dependencies.
   *
   * @param name - A unique provider identifier (e.g. 'openai', 'anthropic').
   * @param provider - An async function or an {@link ILLMProvider} object.
   *
   * @example
   * ```ts
   * // Function form
   * fuzzer.registerProvider('openai', async (prompt) => {
   *   const res = await openai.chat.completions.create({ ... });
   *   return res.choices[0].message.content;
   * });
   *
   * // Object form
   * fuzzer.registerProvider('anthropic', new MyAnthropicProvider());
   * ```
   */
  public registerProvider(name: string, provider: LLMProviderFn | ILLMProvider): void {
    const fn: LLMProviderFn =
      typeof provider === 'function'
        ? provider
        : (prompt: string, model?: string) => provider.generate(prompt, model);
    this.providers[name] = fn;
  }

  /**
   * Invokes the specified LLM provider with the given prompt.
   *
   * If `timeoutMs` is set, the call is raced against a timer. On timeout:
   * - If `fallback` is provided, the fallback string is returned.
   * - Otherwise, a {@link FuzzerTimeoutError} is thrown.
   *
   * If the provider throws and `fallback` is provided, the fallback is returned
   * instead of propagating the error.
   *
   * @param options - Fuzzing options including provider name, prompt, and optional timeout/fallback.
   * @returns A promise resolving to the LLM-generated string (or fallback).
   * @throws {@link FuzzerTimeoutError} on timeout when no fallback is configured.
   * @throws If the specified provider has not been registered.
   */
  public async fuzz(options: GenerativeFuzzingOptions): Promise<string> {
    const { provider, prompt, model, timeoutMs, fallback } = options;
    const providerFn = this.providers[provider];
    if (!providerFn) {
      throw new Error(
        `LLM provider "${provider}" is not registered. ` +
          `Call registerProvider("${provider}", fn) first.`,
      );
    }

    const call = providerFn(prompt, model);

    const raced: Promise<string> =
      timeoutMs !== undefined
        ? Promise.race([
            call,
            new Promise<string>((_, reject) =>
              (globalThis as typeof globalThis & { setTimeout: (fn: () => void, ms: number) => void }).setTimeout(
                () => reject(new FuzzerTimeoutError(provider, timeoutMs)),
                timeoutMs,
              ),
            ),
          ])
        : call;

    try {
      return await raced;
    } catch (err) {
      if (fallback !== undefined) {
        return fallback;
      }
      throw err;
    }
  }
}
