import { SeededPRNG } from '../prng/SeededPRNG.js';
import { WeightedCategorical } from '../types/index.js';

/**
 * CategoricalSpoofer selects discrete values based on weighted probabilities.
 * All methods are pure functions that accept a PRNG for determinism.
 */
export class CategoricalSpoofer {
  /**
   * Selects a category from a weighted map.
   *
   * The weights do not need to sum to 1 — they are normalized internally.
   *
   * @param prng - A seeded PRNG instance.
   * @param weights - A record mapping category names to their relative weights.
   * @returns The selected category key.
   * @throws If the weights map is empty or all weights are zero.
   *
   * @example
   * ```ts
   * const result = CategoricalSpoofer.sample(prng, { rain: 0.7, sunny: 0.3 });
   * ```
   */
  public static sample(prng: SeededPRNG, weights: WeightedCategorical): string {
    const entries = Object.entries(weights);
    if (entries.length === 0) {
      throw new Error('Weights map must not be empty.');
    }

    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    if (total <= 0) {
      throw new Error('Total weight must be greater than zero.');
    }

    const rand = prng.next() * total;
    let cumulative = 0;
    for (const [category, weight] of entries) {
      cumulative += weight;
      if (rand < cumulative) {
        return category;
      }
    }

    // Fallback to the last category (handles floating-point edge cases)
    const last = entries[entries.length - 1];
    if (!last) {
      throw new Error('Weights map must not be empty.');
    }
    return last[0];
  }
}
