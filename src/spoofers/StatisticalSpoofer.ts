import { SeededPRNG } from '../prng/SeededPRNG.js';
import { GaussianOptions, UniformOptions, PoissonOptions } from '../types/index.js';

/**
 * StatisticalSpoofer applies probability-distribution-based noise to numeric values.
 * All methods are pure functions that accept a PRNG for determinism.
 */
export class StatisticalSpoofer {
  /**
   * Generates a sample from a Gaussian (normal) distribution using the
   * Box-Muller transform.
   *
   * @param prng - A seeded PRNG instance for deterministic output.
   * @param options - Gaussian distribution parameters.
   * @returns A sample from N(mean, stdDev²).
   */
  public static gaussian(prng: SeededPRNG, options: GaussianOptions): number {
    const { mean, stdDev } = options;
    // Box-Muller transform
    let u1: number;
    let u2: number;
    do {
      u1 = prng.next();
    } while (u1 === 0);
    u2 = prng.next();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * stdDev;
  }

  /**
   * Generates a sample from a Uniform distribution in [min, max).
   *
   * @param prng - A seeded PRNG instance.
   * @param options - Uniform distribution parameters.
   * @returns A uniformly distributed value in [min, max).
   */
  public static uniform(prng: SeededPRNG, options: UniformOptions): number {
    const { min, max } = options;
    return min + prng.next() * (max - min);
  }

  /**
   * Generates a sample from a Poisson distribution using Knuth's algorithm.
   *
   * @param prng - A seeded PRNG instance.
   * @param options - Poisson distribution parameters.
   * @returns A Poisson-distributed integer.
   */
  public static poisson(prng: SeededPRNG, options: PoissonOptions): number {
    const { lambda } = options;
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= prng.next();
    } while (p > L);
    return k - 1;
  }
}
