/**
 * Converts a string seed to a stable 32-bit unsigned integer via the
 * djb2 hash algorithm.
 *
 * @param s - The string to hash.
 * @returns A 32-bit unsigned integer derived from the string.
 */
function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(h, 33) ^ s.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Mulberry32 - A simple, fast 32-bit seedable PRNG.
 * Produces deterministic, reproducible pseudo-random numbers.
 */
export class SeededPRNG {
  private state: number;

  /**
   * Creates a new SeededPRNG instance.
   * @param seed - A numeric or string seed value for deterministic output.
   *               String seeds are hashed to a 32-bit integer via djb2.
   */
  constructor(seed: number | string) {
    this.state = (typeof seed === 'string' ? hashString(seed) : seed) >>> 0;
  }

  /**
   * Returns the next pseudo-random float in [0, 1).
   */
  public next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let z = this.state;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a pseudo-random integer in [min, max] (inclusive).
   * @param min - Minimum value (inclusive).
   * @param max - Maximum value (inclusive).
   */
  public nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Returns a pseudo-random float in [min, max).
   * @param min - Minimum value (inclusive).
   * @param max - Maximum value (exclusive).
   */
  public randomUniform(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Returns a pseudo-random sample from a Gaussian (normal) distribution
   * using the Box-Muller transform.
   * @param mean - Mean (μ) of the distribution.
   * @param stdDev - Standard deviation (σ) of the distribution.
   */
  public randomGaussian(mean: number, stdDev: number): number {
    let u1: number;
    let u2: number;
    do {
      u1 = this.next();
    } while (u1 === 0);
    u2 = this.next();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * stdDev;
  }

  /**
   * Selects a key from a weighted map using cumulative weighting.
   * Weights do not need to sum to 1 — they are normalised internally.
   * @param weights - A record mapping keys to their relative weights.
   * @returns The selected key.
   * @throws If the weights map is empty or all weights are zero.
   */
  public randomWeighted(weights: Record<string, number>): string {
    const entries = Object.entries(weights);
    if (entries.length === 0) {
      throw new Error('Weights map must not be empty.');
    }
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    if (total <= 0) {
      throw new Error('Total weight must be greater than zero.');
    }
    const rand = this.next() * total;
    let cumulative = 0;
    for (const [key, weight] of entries) {
      cumulative += weight;
      if (rand < cumulative) {
        return key;
      }
    }
    return entries[entries.length - 1]![0];
  }

  /**
   * Resets the PRNG to a new seed value.
   * @param seed - The new numeric or string seed value.
   */
  public reseed(seed: number | string): void {
    this.state = (typeof seed === 'string' ? hashString(seed) : seed) >>> 0;
  }
}
