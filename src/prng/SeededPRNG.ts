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
   * Resets the PRNG to a new seed value.
   * @param seed - The new numeric or string seed value.
   */
  public reseed(seed: number | string): void {
    this.state = (typeof seed === 'string' ? hashString(seed) : seed) >>> 0;
  }
}
