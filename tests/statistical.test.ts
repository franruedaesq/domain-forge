import { describe, it, expect } from 'vitest';
import { SeededPRNG } from '../src/prng/SeededPRNG.js';
import { StatisticalSpoofer } from '../src/spoofers/StatisticalSpoofer.js';

describe('StatisticalSpoofer.gaussian', () => {
  it('produces values with roughly correct mean over many samples', () => {
    const prng = new SeededPRNG(1);
    const samples = Array.from({ length: 5000 }, () =>
      StatisticalSpoofer.gaussian(prng, { mean: 0, stdDev: 1 }),
    );
    const empiricalMean = samples.reduce((a, b) => a + b, 0) / samples.length;
    expect(empiricalMean).toBeCloseTo(0, 1); // within ±0.1
  });

  it('is deterministic with the same seed', () => {
    const prng1 = new SeededPRNG(42);
    const prng2 = new SeededPRNG(42);
    const v1 = StatisticalSpoofer.gaussian(prng1, { mean: 5, stdDev: 2 });
    const v2 = StatisticalSpoofer.gaussian(prng2, { mean: 5, stdDev: 2 });
    expect(v1).toBe(v2);
  });

  it('respects mean and stdDev parameters', () => {
    const prng = new SeededPRNG(7);
    const samples = Array.from({ length: 3000 }, () =>
      StatisticalSpoofer.gaussian(prng, { mean: 100, stdDev: 10 }),
    );
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    expect(mean).toBeCloseTo(100, 0); // within ±1
  });
});

describe('StatisticalSpoofer.uniform', () => {
  it('produces values in [min, max)', () => {
    const prng = new SeededPRNG(3);
    for (let i = 0; i < 500; i++) {
      const val = StatisticalSpoofer.uniform(prng, { min: 5, max: 10 });
      expect(val).toBeGreaterThanOrEqual(5);
      expect(val).toBeLessThan(10);
    }
  });

  it('is deterministic with the same seed', () => {
    const prng1 = new SeededPRNG(50);
    const prng2 = new SeededPRNG(50);
    expect(StatisticalSpoofer.uniform(prng1, { min: 0, max: 1 })).toBe(
      StatisticalSpoofer.uniform(prng2, { min: 0, max: 1 }),
    );
  });

  it('produces values spread across the range', () => {
    const prng = new SeededPRNG(11);
    const samples = Array.from({ length: 10000 }, () =>
      StatisticalSpoofer.uniform(prng, { min: 0, max: 100 }),
    );
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
    // Uniform mean ≈ (min+max)/2 = 50; allow ±2 with 10,000 samples
    expect(mean).toBeGreaterThan(48);
    expect(mean).toBeLessThan(52);
  });
});

describe('StatisticalSpoofer.poisson', () => {
  it('produces non-negative integers', () => {
    const prng = new SeededPRNG(17);
    for (let i = 0; i < 200; i++) {
      const val = StatisticalSpoofer.poisson(prng, { lambda: 5 });
      expect(val).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(val)).toBe(true);
    }
  });

  it('mean converges to lambda over many samples', () => {
    const prng = new SeededPRNG(99);
    const lambda = 4;
    const samples = Array.from({ length: 5000 }, () =>
      StatisticalSpoofer.poisson(prng, { lambda }),
    );
    const empiricalMean = samples.reduce((a, b) => a + b, 0) / samples.length;
    expect(empiricalMean).toBeCloseTo(lambda, 0); // within ±1
  });

  it('is deterministic with the same seed', () => {
    const prng1 = new SeededPRNG(13);
    const prng2 = new SeededPRNG(13);
    expect(StatisticalSpoofer.poisson(prng1, { lambda: 3 })).toBe(
      StatisticalSpoofer.poisson(prng2, { lambda: 3 }),
    );
  });
});
