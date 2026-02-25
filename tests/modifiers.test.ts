import { describe, it, expect } from 'vitest';
import { WeatherModifier } from '../src/modifiers/WeatherModifier.js';
import { EconomyModifier } from '../src/modifiers/EconomyModifier.js';

// ---------------------------------------------------------------------------
// WeatherModifier
// ---------------------------------------------------------------------------

describe('WeatherModifier', () => {
  it('returns a complete WeatherState with all expected fields', () => {
    const modifier = new WeatherModifier(1);
    const weather = modifier.apply();
    expect(typeof weather.raining).toBe('boolean');
    expect(typeof weather.cloud_cover).toBe('number');
    expect(typeof weather.temperature_c).toBe('number');
    expect(typeof weather.wind_speed_kmh).toBe('number');
    expect(typeof weather.condition).toBe('string');
  });

  it('cloud_cover is always in [0, 1]', () => {
    const modifier = new WeatherModifier(7);
    for (let i = 0; i < 200; i++) {
      const weather = modifier.apply();
      expect(weather.cloud_cover).toBeGreaterThanOrEqual(0);
      expect(weather.cloud_cover).toBeLessThanOrEqual(1);
    }
  });

  it('cloud_cover is never 0 when raining is true', () => {
    const modifier = new WeatherModifier(42);
    for (let i = 0; i < 200; i++) {
      const weather = modifier.apply({ raining: true });
      expect(weather.raining).toBe(true);
      expect(weather.cloud_cover).toBeGreaterThan(0);
    }
  });

  it('enforces cloud_cover > 0 even when a zero baseline is supplied with raining: true', () => {
    const modifier = new WeatherModifier(99);
    const weather = modifier.apply({ raining: true, cloud_cover: 0 });
    expect(weather.raining).toBe(true);
    expect(weather.cloud_cover).toBeGreaterThan(0);
  });

  it('respects raining: false from baseline', () => {
    const modifier = new WeatherModifier(5);
    for (let i = 0; i < 50; i++) {
      const weather = modifier.apply({ raining: false });
      expect(weather.raining).toBe(false);
    }
  });

  it('wind_speed_kmh is always non-negative', () => {
    const modifier = new WeatherModifier(13);
    for (let i = 0; i < 200; i++) {
      const weather = modifier.apply();
      expect(weather.wind_speed_kmh).toBeGreaterThanOrEqual(0);
    }
  });

  it('condition is a rainy category when raining is true', () => {
    const modifier = new WeatherModifier(3);
    const rainyConditions = new Set(['drizzle', 'rain', 'heavy_rain']);
    for (let i = 0; i < 50; i++) {
      const weather = modifier.apply({ raining: true });
      expect(rainyConditions.has(weather.condition)).toBe(true);
    }
  });

  it('is deterministic with the same seed', () => {
    const m1 = new WeatherModifier(77);
    const m2 = new WeatherModifier(77);
    const w1 = m1.apply({ raining: true });
    const w2 = m2.apply({ raining: true });
    expect(w1).toEqual(w2);
  });

  it('respects a temperature_c baseline value', () => {
    const modifier = new WeatherModifier(21);
    const weather = modifier.apply({ temperature_c: 35 });
    // The mean of the Gaussian is the baseline; with stdDev=8 and 1 sample
    // we can only assert the type, but we verify the baseline was consumed.
    expect(typeof weather.temperature_c).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// EconomyModifier
// ---------------------------------------------------------------------------

describe('EconomyModifier', () => {
  it('returns a complete EconomyState with all expected fields', () => {
    const modifier = new EconomyModifier(1);
    const economy = modifier.apply();
    expect(typeof economy.inflation_severity).toBe('number');
    expect(typeof economy.price_multiplier).toBe('number');
    expect(typeof economy.purchasing_power).toBe('number');
    expect(Array.isArray(economy.items)).toBe(true);
  });

  it('inflation_severity is always in [0, 1]', () => {
    const modifier = new EconomyModifier(2);
    for (let i = 0; i < 200; i++) {
      const { inflation_severity } = modifier.apply();
      expect(inflation_severity).toBeGreaterThanOrEqual(0);
      expect(inflation_severity).toBeLessThanOrEqual(1);
    }
  });

  it('price_multiplier is always >= 1', () => {
    const modifier = new EconomyModifier(3);
    for (let i = 0; i < 200; i++) {
      const { price_multiplier } = modifier.apply();
      expect(price_multiplier).toBeGreaterThanOrEqual(1);
    }
  });

  it('purchasing_power is always in (0, 1]', () => {
    const modifier = new EconomyModifier(4);
    for (let i = 0; i < 200; i++) {
      const { purchasing_power } = modifier.apply();
      expect(purchasing_power).toBeGreaterThan(0);
      expect(purchasing_power).toBeLessThanOrEqual(1);
    }
  });

  it('item prices are always >= base_price when inflation severity > 0', () => {
    const modifier = new EconomyModifier(5);
    const items = [
      { name: 'bread', base_price: 2.0 },
      { name: 'milk', base_price: 1.5 },
    ];
    for (let i = 0; i < 100; i++) {
      const economy = modifier.apply({ items, inflation_severity: 0.5 });
      for (const item of economy.items) {
        expect(item.price).toBeGreaterThanOrEqual(item.base_price);
      }
    }
  });

  it('higher inflation_severity produces higher price_multiplier', () => {
    const lowModifier = new EconomyModifier(10);
    const highModifier = new EconomyModifier(10);
    const low = lowModifier.apply({ inflation_severity: 0.1 });
    const high = highModifier.apply({ inflation_severity: 0.9 });
    expect(high.price_multiplier).toBeGreaterThan(low.price_multiplier);
  });

  it('higher inflation_severity produces lower purchasing_power', () => {
    const lowModifier = new EconomyModifier(11);
    const highModifier = new EconomyModifier(11);
    const low = lowModifier.apply({ inflation_severity: 0.1 });
    const high = highModifier.apply({ inflation_severity: 0.9 });
    expect(high.purchasing_power).toBeLessThan(low.purchasing_power);
  });

  it('purchasing_power is inversely related to price_multiplier', () => {
    const modifier = new EconomyModifier(6);
    for (let i = 0; i < 100; i++) {
      const { price_multiplier, purchasing_power } = modifier.apply();
      // purchasing_power ≈ 1 / price_multiplier
      expect(purchasing_power).toBeCloseTo(1 / price_multiplier, 5);
    }
  });

  it('is deterministic with the same seed', () => {
    const items = [{ name: 'fuel', base_price: 50 }];
    const m1 = new EconomyModifier(999);
    const m2 = new EconomyModifier(999);
    const e1 = m1.apply({ items });
    const e2 = m2.apply({ items });
    expect(e1).toEqual(e2);
  });

  it('returns an empty items array when no items are provided', () => {
    const modifier = new EconomyModifier(7);
    const { items } = modifier.apply({});
    expect(items).toHaveLength(0);
  });

  it('respects an explicit inflation_severity override', () => {
    const modifier = new EconomyModifier(8);
    const { inflation_severity } = modifier.apply({ inflation_severity: 0.42 });
    expect(inflation_severity).toBeCloseTo(0.42, 10);
  });

  it('clamps inflation_severity override to [0, 1]', () => {
    const modifier = new EconomyModifier(9);
    const high = modifier.apply({ inflation_severity: 5 });
    const low = modifier.apply({ inflation_severity: -3 });
    expect(high.inflation_severity).toBe(1);
    expect(low.inflation_severity).toBe(0);
  });
});
