import { describe, it, expect, vi } from 'vitest';
import { GenerativeFuzzer, FuzzerTimeoutError } from '../src/fuzzer/GenerativeFuzzer.js';
import type { ILLMProvider } from '../src/types/index.js';

describe('GenerativeFuzzer', () => {
  it('registers and invokes a provider', async () => {
    const fuzzer = new GenerativeFuzzer();
    const mockFn = vi.fn().mockResolvedValue('A panicked merchant');
    fuzzer.registerProvider('mock', mockFn);

    const result = await fuzzer.fuzz({ provider: 'mock', prompt: 'Generate a personality' });
    expect(result).toBe('A panicked merchant');
    expect(mockFn).toHaveBeenCalledWith('Generate a personality', undefined);
  });

  it('passes model override to the provider', async () => {
    const fuzzer = new GenerativeFuzzer();
    const mockFn = vi.fn().mockResolvedValue('Response');
    fuzzer.registerProvider('mock', mockFn);

    await fuzzer.fuzz({ provider: 'mock', prompt: 'Prompt', model: 'gpt-4o' });
    expect(mockFn).toHaveBeenCalledWith('Prompt', 'gpt-4o');
  });

  it('throws when provider is not registered', async () => {
    const fuzzer = new GenerativeFuzzer();
    await expect(
      fuzzer.fuzz({ provider: 'nonexistent', prompt: 'test' }),
    ).rejects.toThrow('LLM provider "nonexistent" is not registered');
  });

  it('overwrites a provider when registered again with same name', async () => {
    const fuzzer = new GenerativeFuzzer();
    fuzzer.registerProvider('p', vi.fn().mockResolvedValue('old'));
    fuzzer.registerProvider('p', vi.fn().mockResolvedValue('new'));
    const result = await fuzzer.fuzz({ provider: 'p', prompt: 'x' });
    expect(result).toBe('new');
  });

  it('accepts an ILLMProvider object as a provider', async () => {
    const fuzzer = new GenerativeFuzzer();
    const provider: ILLMProvider = {
      generate: vi.fn().mockResolvedValue('object provider result'),
    };
    fuzzer.registerProvider('obj', provider);

    const result = await fuzzer.fuzz({ provider: 'obj', prompt: 'hello' });
    expect(result).toBe('object provider result');
    expect(provider.generate).toHaveBeenCalledWith('hello', undefined);
  });

  it('passes model to ILLMProvider.generate', async () => {
    const fuzzer = new GenerativeFuzzer();
    const provider: ILLMProvider = {
      generate: vi.fn().mockResolvedValue('with model'),
    };
    fuzzer.registerProvider('obj', provider);

    await fuzzer.fuzz({ provider: 'obj', prompt: 'hello', model: 'claude-3' });
    expect(provider.generate).toHaveBeenCalledWith('hello', 'claude-3');
  });

  it('throws FuzzerTimeoutError when LLM times out and no fallback is set', async () => {
    vi.useFakeTimers();
    const fuzzer = new GenerativeFuzzer();
    const slowFn = vi.fn().mockImplementation(
      () => new Promise<string>((resolve) => setTimeout(() => resolve('late'), 5000)),
    );
    fuzzer.registerProvider('slow', slowFn);

    const fuzzPromise = fuzzer.fuzz({ provider: 'slow', prompt: 'test', timeoutMs: 100 });
    vi.advanceTimersByTime(200);
    await expect(fuzzPromise).rejects.toBeInstanceOf(FuzzerTimeoutError);
    vi.useRealTimers();
  });

  it('FuzzerTimeoutError has the correct name and message', async () => {
    vi.useFakeTimers();
    const fuzzer = new GenerativeFuzzer();
    fuzzer.registerProvider(
      'slow',
      () => new Promise<string>((resolve) => setTimeout(() => resolve('late'), 5000)),
    );

    const fuzzPromise = fuzzer.fuzz({ provider: 'slow', prompt: 'test', timeoutMs: 50 });
    vi.advanceTimersByTime(100);
    const err = await fuzzPromise.catch((e: unknown) => e);
    expect(err).toBeInstanceOf(FuzzerTimeoutError);
    expect((err as FuzzerTimeoutError).name).toBe('FuzzerTimeoutError');
    expect((err as FuzzerTimeoutError).message).toContain('"slow"');
    expect((err as FuzzerTimeoutError).message).toContain('50ms');
    vi.useRealTimers();
  });

  it('returns fallback when LLM times out and fallback is configured', async () => {
    vi.useFakeTimers();
    const fuzzer = new GenerativeFuzzer();
    fuzzer.registerProvider(
      'slow',
      () => new Promise<string>((resolve) => setTimeout(() => resolve('late'), 5000)),
    );

    const fuzzPromise = fuzzer.fuzz({
      provider: 'slow',
      prompt: 'test',
      timeoutMs: 100,
      fallback: 'default_personality',
    });
    vi.advanceTimersByTime(200);
    const result = await fuzzPromise;
    expect(result).toBe('default_personality');
    vi.useRealTimers();
  });

  it('returns fallback when LLM throws an error', async () => {
    const fuzzer = new GenerativeFuzzer();
    fuzzer.registerProvider('error', vi.fn().mockRejectedValue(new Error('API error')));

    const result = await fuzzer.fuzz({
      provider: 'error',
      prompt: 'test',
      fallback: 'fallback_value',
    });
    expect(result).toBe('fallback_value');
  });

  it('rethrows LLM errors when no fallback is configured', async () => {
    const fuzzer = new GenerativeFuzzer();
    fuzzer.registerProvider('error', vi.fn().mockRejectedValue(new Error('API error')));

    await expect(fuzzer.fuzz({ provider: 'error', prompt: 'test' })).rejects.toThrow('API error');
  });
});
