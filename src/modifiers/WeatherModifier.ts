import { SeededPRNG } from '../prng/SeededPRNG.js';
import { StatisticalSpoofer } from '../spoofers/StatisticalSpoofer.js';
import { CategoricalSpoofer } from '../spoofers/CategoricalSpoofer.js';

/** A snapshot of weather conditions produced by {@link WeatherModifier}. */
export interface WeatherState {
  /** Whether it is currently raining. */
  raining: boolean;
  /**
   * Fraction of sky covered by clouds, in the range [0, 1].
   * Guaranteed to be > 0 when `raining` is `true`.
   */
  cloud_cover: number;
  /** Ambient temperature in degrees Celsius. */
  temperature_c: number;
  /** Wind speed in km/h (non-negative). */
  wind_speed_kmh: number;
  /** Qualitative description sampled from weighted categories. */
  condition: string;
}

/** Baseline weather values used as the starting point before randomization. */
export interface WeatherBaseline {
  raining?: boolean;
  cloud_cover?: number;
  temperature_c?: number;
  wind_speed_kmh?: number;
}

/**
 * WeatherModifier generates logically consistent weather snapshots.
 *
 * Guarantees:
 * - `cloud_cover` is always in [0, 1].
 * - When `raining` is `true`, `cloud_cover` is always > 0 (at least 0.4).
 * - `wind_speed_kmh` is always non-negative.
 * - All numeric fields use seeded distributions for full determinism.
 *
 * @example
 * ```ts
 * const modifier = new WeatherModifier({ seed: 42 });
 * const weather = modifier.apply({ raining: true });
 * // weather.cloud_cover is guaranteed to be > 0
 * ```
 */
export class WeatherModifier {
  private readonly prng: SeededPRNG;

  constructor(seed: number | string = Date.now()) {
    this.prng = new SeededPRNG(seed);
  }

  /**
   * Applies randomization to the given baseline and returns a fully-populated,
   * logically consistent {@link WeatherState}.
   *
   * @param baseline - Optional partial weather state used as a starting point.
   * @returns A complete, consistent weather snapshot.
   */
  public apply(baseline: WeatherBaseline = {}): WeatherState {
    // Determine raining: use baseline if provided, otherwise sample randomly.
    const raining = baseline.raining ?? this.prng.next() < 0.3;

    // Cloud cover: if raining, must be at least 0.4; otherwise sample freely.
    let cloud_cover: number;
    if (baseline.cloud_cover !== undefined) {
      // Respect the baseline value, but enforce the rain consistency rule.
      cloud_cover = raining
        ? Math.max(baseline.cloud_cover, 0.4)
        : Math.min(Math.max(baseline.cloud_cover, 0), 1);
    } else if (raining) {
      // Rain requires meaningful cloud cover: uniform in [0.4, 1].
      cloud_cover = StatisticalSpoofer.uniform(this.prng, { min: 0.4, max: 1.0 });
    } else {
      // No rain: cloud cover can range from clear to mostly cloudy.
      cloud_cover = StatisticalSpoofer.uniform(this.prng, { min: 0.0, max: 0.85 });
    }

    // Temperature: Gaussian around a baseline (default 15 °C), ±8 °C stdDev.
    const tempBase = baseline.temperature_c ?? 15;
    const temperature_c = StatisticalSpoofer.gaussian(this.prng, {
      mean: tempBase,
      stdDev: 8,
    });

    // Wind speed: Poisson-like (always non-negative), clamped to ≥ 0.
    const windBase = baseline.wind_speed_kmh ?? 15;
    const wind_speed_kmh = Math.max(
      0,
      StatisticalSpoofer.gaussian(this.prng, { mean: windBase, stdDev: 10 }),
    );

    // Qualitative condition driven by raining + cloud_cover.
    const condition = this._sampleCondition(raining, cloud_cover);

    return { raining, cloud_cover, temperature_c, wind_speed_kmh, condition };
  }

  private _sampleCondition(raining: boolean, cloudCover: number): string {
    if (raining) {
      return CategoricalSpoofer.sample(this.prng, {
        drizzle: 0.3,
        rain: 0.5,
        heavy_rain: 0.2,
      });
    }
    if (cloudCover > 0.6) {
      return CategoricalSpoofer.sample(this.prng, {
        overcast: 0.6,
        partly_cloudy: 0.4,
      });
    }
    return CategoricalSpoofer.sample(this.prng, {
      sunny: 0.7,
      partly_cloudy: 0.3,
    });
  }
}
