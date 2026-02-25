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
});
