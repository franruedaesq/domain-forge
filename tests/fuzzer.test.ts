import { describe, it, expect, vi } from 'vitest';
import { GenerativeFuzzer } from '../src/fuzzer/GenerativeFuzzer.js';

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
});
