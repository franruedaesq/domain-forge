/**
 * domain-forge — A deterministic, extensible TypeScript library for
 * Domain Randomization, Data Spoofing, and Scenario Fuzzing.
 *
 * @example
 * ```ts
 * import { RandomizationEngine } from 'domain-forge';
 *
 * const engine = new RandomizationEngine({ seed: 42 });
 * const scenario = await engine
 *   .applyGaussianNoise('gravity', { mean: 9.8, stdDev: 0.5 })
 *   .applyWeightedCategorical('weather', { rain: 0.7, sunny: 0.3 })
 *   .generate();
 * ```
 *
 * @packageDocumentation
 */

export { RandomizationEngine } from './engine/index.js';
export { SeededPRNG } from './prng/index.js';
export { StatisticalSpoofer, CategoricalSpoofer } from './spoofers/index.js';
export { GenerativeFuzzer } from './fuzzer/index.js';
export { WeatherModifier, EconomyModifier } from './modifiers/index.js';
export type {
  GaussianOptions,
  UniformOptions,
  PoissonOptions,
  WeightedCategorical,
  GenerativeFuzzingOptions,
  EngineOptions,
  ScenarioRecord,
  LLMProviderFn,
  LLMProviderRegistry,
} from './types/index.js';
export type {
  WeatherState,
  WeatherBaseline,
  EconomyState,
  EconomyItem,
  InflationStressorOptions,
} from './modifiers/index.js';
