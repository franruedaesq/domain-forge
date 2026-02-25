import { describe, it, expect } from 'vitest';
import { SeededPRNG } from '../src/prng/SeededPRNG.js';
import { CategoricalSpoofer } from '../src/spoofers/CategoricalSpoofer.js';

describe('CategoricalSpoofer.sample', () => {
  it('always returns one of the provided categories', () => {
    const prng = new SeededPRNG(42);
    const weights = { rain: 0.7, sunny: 0.3 };
    for (let i = 0; i < 200; i++) {
      const result = CategoricalSpoofer.sample(prng, weights);
      expect(['rain', 'sunny']).toContain(result);
    }
  });

  it('respects weights over many samples', () => {
    const prng = new SeededPRNG(5);
    const weights = { rain: 0.9, sunny: 0.1 };
    let rainCount = 0;
    const n = 5000;
    for (let i = 0; i < n; i++) {
      if (CategoricalSpoofer.sample(prng, weights) === 'rain') rainCount++;
    }
    const rainFreq = rainCount / n;
    expect(rainFreq).toBeGreaterThan(0.8); // should be close to 0.9
    expect(rainFreq).toBeLessThan(1.0);
  });

  it('is deterministic with the same seed', () => {
    const prng1 = new SeededPRNG(100);
    const prng2 = new SeededPRNG(100);
    const weights = { a: 1, b: 2, c: 3 };
    for (let i = 0; i < 50; i++) {
      expect(CategoricalSpoofer.sample(prng1, weights)).toBe(
        CategoricalSpoofer.sample(prng2, weights),
      );
    }
  });

  it('works with a single category', () => {
    const prng = new SeededPRNG(1);
    const result = CategoricalSpoofer.sample(prng, { only: 1 });
    expect(result).toBe('only');
  });

  it('throws when weights map is empty', () => {
    const prng = new SeededPRNG(1);
    expect(() => CategoricalSpoofer.sample(prng, {})).toThrow('must not be empty');
  });

  it('throws when all weights are zero', () => {
    const prng = new SeededPRNG(1);
    expect(() => CategoricalSpoofer.sample(prng, { a: 0, b: 0 })).toThrow(
      'Total weight must be greater than zero',
    );
  });

  it('handles non-normalised weights (unnormalized integers)', () => {
    const prng = new SeededPRNG(77);
    const weights = { low: 1, high: 9 };
    let highCount = 0;
    const n = 2000;
    for (let i = 0; i < n; i++) {
      if (CategoricalSpoofer.sample(prng, weights) === 'high') highCount++;
    }
    const highFreq = highCount / n;
    expect(highFreq).toBeGreaterThan(0.8);
  });
});
