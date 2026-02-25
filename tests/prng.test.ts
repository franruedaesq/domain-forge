import { describe, it, expect } from 'vitest';
import { SeededPRNG } from '../src/prng/SeededPRNG.js';

describe('SeededPRNG', () => {
  it('produces values in [0, 1)', () => {
    const prng = new SeededPRNG(42);
    for (let i = 0; i < 1000; i++) {
      const val = prng.next();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('is deterministic: same seed produces same sequence', () => {
    const prng1 = new SeededPRNG(12345);
    const prng2 = new SeededPRNG(12345);
    for (let i = 0; i < 100; i++) {
      expect(prng1.next()).toBe(prng2.next());
    }
  });

  it('produces different sequences for different seeds', () => {
    const prng1 = new SeededPRNG(1);
    const prng2 = new SeededPRNG(2);
    const results1 = Array.from({ length: 10 }, () => prng1.next());
    const results2 = Array.from({ length: 10 }, () => prng2.next());
    expect(results1).not.toEqual(results2);
  });

  it('nextInt returns integers in [min, max]', () => {
    const prng = new SeededPRNG(99);
    for (let i = 0; i < 500; i++) {
      const val = prng.nextInt(1, 6);
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(6);
      expect(Number.isInteger(val)).toBe(true);
    }
  });

  it('reseed resets the sequence to match a fresh instance', () => {
    const prng = new SeededPRNG(777);
    // Advance state
    prng.next();
    prng.next();
    // Reseed
    prng.reseed(777);
    const fresh = new SeededPRNG(777);
    for (let i = 0; i < 50; i++) {
      expect(prng.next()).toBe(fresh.next());
    }
  });

  it('accepts a string seed and is deterministic', () => {
    const prng1 = new SeededPRNG('hello');
    const prng2 = new SeededPRNG('hello');
    const seq1 = Array.from({ length: 10 }, () => prng1.next());
    const seq2 = Array.from({ length: 10 }, () => prng2.next());
    expect(seq1).toEqual(seq2);
  });

  it('produces different sequences for different string seeds', () => {
    const prng1 = new SeededPRNG('seed-A');
    const prng2 = new SeededPRNG('seed-B');
    const seq1 = Array.from({ length: 10 }, () => prng1.next());
    const seq2 = Array.from({ length: 10 }, () => prng2.next());
    expect(seq1).not.toEqual(seq2);
  });

  it('reseed with a string resets to the same sequence', () => {
    const prng = new SeededPRNG('world');
    prng.next();
    prng.reseed('world');
    const fresh = new SeededPRNG('world');
    for (let i = 0; i < 20; i++) {
      expect(prng.next()).toBe(fresh.next());
    }
  });
});

describe('SeededPRNG.randomUniform', () => {
  it('always falls within [min, max)', () => {
    const prng = new SeededPRNG(42);
    for (let i = 0; i < 10000; i++) {
      const val = prng.randomUniform(5, 15);
      expect(val).toBeGreaterThanOrEqual(5);
      expect(val).toBeLessThan(15);
    }
  });

  it('is deterministic with the same seed', () => {
    const prng1 = new SeededPRNG(99);
    const prng2 = new SeededPRNG(99);
    expect(prng1.randomUniform(0, 100)).toBe(prng2.randomUniform(0, 100));
  });

  it('mean converges to (min+max)/2 over many samples', () => {
    const prng = new SeededPRNG(7);
    const samples = Array.from({ length: 10000 }, () => prng.randomUniform(0, 100));
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    expect(mean).toBeGreaterThan(48);
    expect(mean).toBeLessThan(52);
  });
});

describe('SeededPRNG.randomGaussian', () => {
  it('mean converges to the provided mean over 10,000 samples', () => {
    const prng = new SeededPRNG(1);
    const samples = Array.from({ length: 10000 }, () => prng.randomGaussian(50, 5));
    const empiricalMean = samples.reduce((a, b) => a + b, 0) / samples.length;
    expect(empiricalMean).toBeGreaterThan(49);
    expect(empiricalMean).toBeLessThan(51);
  });

  it('standard deviation converges to the provided stdDev over 10,000 samples', () => {
    const prng = new SeededPRNG(2);
    const n = 10000;
    const samples = Array.from({ length: n }, () => prng.randomGaussian(0, 10));
    const mean = samples.reduce((a, b) => a + b, 0) / n;
    const variance = samples.reduce((sum, x) => sum + (x - mean) ** 2, 0) / n;
    const stdDev = Math.sqrt(variance);
    expect(stdDev).toBeGreaterThan(9);
    expect(stdDev).toBeLessThan(11);
  });

  it('is deterministic with the same seed', () => {
    const prng1 = new SeededPRNG(55);
    const prng2 = new SeededPRNG(55);
    expect(prng1.randomGaussian(0, 1)).toBe(prng2.randomGaussian(0, 1));
  });
});

describe('SeededPRNG.randomWeighted', () => {
  it("selects 'a' roughly 90% of the time given { a: 0.9, b: 0.1 }", () => {
    const prng = new SeededPRNG(3);
    let aCount = 0;
    const n = 1000;
    for (let i = 0; i < n; i++) {
      if (prng.randomWeighted({ a: 0.9, b: 0.1 }) === 'a') aCount++;
    }
    const aFreq = aCount / n;
    expect(aFreq).toBeGreaterThan(0.85);
    expect(aFreq).toBeLessThan(0.95);
  });

  it('always returns one of the provided keys', () => {
    const prng = new SeededPRNG(10);
    const weights = { x: 1, y: 2, z: 3 };
    for (let i = 0; i < 200; i++) {
      expect(Object.keys(weights)).toContain(prng.randomWeighted(weights));
    }
  });

  it('is deterministic with the same seed', () => {
    const prng1 = new SeededPRNG(77);
    const prng2 = new SeededPRNG(77);
    const weights = { a: 0.5, b: 0.5 };
    for (let i = 0; i < 50; i++) {
      expect(prng1.randomWeighted(weights)).toBe(prng2.randomWeighted(weights));
    }
  });

  it('throws when the weights map is empty', () => {
    const prng = new SeededPRNG(1);
    expect(() => prng.randomWeighted({})).toThrow('must not be empty');
  });

  it('throws when all weights are zero', () => {
    const prng = new SeededPRNG(1);
    expect(() => prng.randomWeighted({ a: 0, b: 0 })).toThrow(
      'Total weight must be greater than zero',
    );
  });
});
