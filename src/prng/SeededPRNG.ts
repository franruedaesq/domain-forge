/**
 * Mulberry32 - A simple, fast 32-bit seedable PRNG.
 * Produces deterministic, reproducible pseudo-random numbers.
 */
export class SeededPRNG {
  private state: number;

  /**
   * Creates a new SeededPRNG instance.
   * @param seed - An integer seed value for deterministic output.
   */
  constructor(seed: number) {
    this.state = seed >>> 0;
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
   * @param seed - The new seed value.
   */
  public reseed(seed: number): void {
    this.state = seed >>> 0;
  }
}
