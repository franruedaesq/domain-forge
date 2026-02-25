import { SeededPRNG } from '../prng/SeededPRNG.js';
import { StatisticalSpoofer } from '../spoofers/StatisticalSpoofer.js';

/** A single priced item in an economy snapshot. */
export interface EconomyItem {
  /** Item name. */
  name: string;
  /** Base price before inflation is applied. */
  base_price: number;
  /** Price after inflation is applied (always ≥ base_price when inflation > 0). */
  price: number;
}

/** Economy state produced by {@link EconomyModifier}. */
export interface EconomyState {
  /** Inflation severity in the range [0, 1], where 1 is maximum inflation. */
  inflation_severity: number;
  /**
   * Multiplier applied to all item prices.
   * Derived from `inflation_severity` via a randomized curve.
   */
  price_multiplier: number;
  /**
   * Purchasing power relative to the pre-inflation baseline (0–1).
   * Inversely related to `price_multiplier`: higher prices reduce purchasing power.
   */
  purchasing_power: number;
  /** Randomized snapshot of item prices after inflation has been applied. */
  items: EconomyItem[];
}

/** Input options for {@link EconomyModifier.apply}. */
export interface InflationStressorOptions {
  /**
   * Items to include in the economy snapshot.
   * Each entry must supply a name and a positive base price.
   */
  items?: Array<{ name: string; base_price: number }>;
  /**
   * Optional override for the inflation severity [0, 1].
   * When omitted the severity is sampled from a Beta-like distribution.
   */
  inflation_severity?: number;
}

/**
 * EconomyModifier applies a randomized inflation stressor to a set of items.
 *
 * Guarantees:
 * - `inflation_severity` is always in [0, 1].
 * - `price_multiplier` is always ≥ 1 (prices never decrease due to inflation).
 * - `purchasing_power` is always in (0, 1] and inversely proportional to the
 *   price multiplier.
 * - Each item's `price` equals `base_price * price_multiplier` (with per-item
 *   Gaussian noise to reflect market variation).
 *
 * @example
 * ```ts
 * const modifier = new EconomyModifier({ seed: 99 });
 * const economy = modifier.apply({
 *   items: [{ name: 'bread', base_price: 2.0 }],
 * });
 * // economy.items[0].price >= economy.items[0].base_price
 * ```
 */
export class EconomyModifier {
  private readonly prng: SeededPRNG;

  constructor(seed: number | string = Date.now()) {
    this.prng = new SeededPRNG(seed);
  }

  /**
   * Applies an inflation stressor and returns a fully-populated
   * {@link EconomyState}.
   *
   * @param options - Items and optional severity override.
   * @returns A complete economy snapshot after inflation has been applied.
   */
  public apply(options: InflationStressorOptions = {}): EconomyState {
    const rawItems = options.items ?? [];

    // Determine inflation severity.
    // When not provided, sample from a right-skewed distribution: we draw two
    // uniform samples and take the maximum so that high-severity events are
    // less common but still possible.
    const inflation_severity =
      options.inflation_severity !== undefined
        ? Math.min(Math.max(options.inflation_severity, 0), 1)
        : Math.max(this.prng.next(), this.prng.next()) *
          // Scale by a Gaussian perturbation to add a smooth severity curve.
          Math.min(
            1,
            Math.max(0, StatisticalSpoofer.gaussian(this.prng, { mean: 0.5, stdDev: 0.25 })),
          );

    // Price multiplier: scales from 1.0 (no inflation) to 3.0 (extreme), driven
    // by the severity curve.
    const price_multiplier = 1 + inflation_severity * 2;

    // Purchasing power is the reciprocal of the price multiplier, normalised to
    // [0, 1] so that it represents the fraction of baseline purchasing power
    // that remains.
    const purchasing_power = Math.min(1, 1 / price_multiplier);

    // Apply multiplier to each item with small per-item Gaussian noise (stdDev
    // proportional to severity) to simulate market variation.
    const items: EconomyItem[] = rawItems.map((item) => {
      const noise = StatisticalSpoofer.gaussian(this.prng, {
        mean: 0,
        stdDev: 0.05 * inflation_severity,
      });
      const price = Math.max(item.base_price, item.base_price * (price_multiplier + noise));
      return { name: item.name, base_price: item.base_price, price };
    });

    return { inflation_severity, price_multiplier, purchasing_power, items };
  }
}
