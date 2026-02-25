import { z } from 'zod';

/** Options for Gaussian (normal) distribution noise. */
export const GaussianOptionsSchema = z.object({
  /** Mean (μ) of the distribution. */
  mean: z.number(),
  /** Standard deviation (σ) of the distribution. Must be positive. */
  stdDev: z.number().positive(),
});
export type GaussianOptions = z.infer<typeof GaussianOptionsSchema>;

/** Options for Uniform distribution noise. */
export const UniformOptionsSchema = z.object({
  /** Minimum value of the range (inclusive). */
  min: z.number(),
  /** Maximum value of the range (exclusive). */
  max: z.number(),
});
export type UniformOptions = z.infer<typeof UniformOptionsSchema>;

/** Options for Poisson distribution. */
export const PoissonOptionsSchema = z.object({
  /** Lambda (λ) — the average number of events. Must be positive. */
  lambda: z.number().positive(),
});
export type PoissonOptions = z.infer<typeof PoissonOptionsSchema>;

/** Weighted map of categorical values. */
export const WeightedCategoricalSchema = z.record(z.string(), z.number().nonnegative());
export type WeightedCategorical = z.infer<typeof WeightedCategoricalSchema>;

/** Options for the Generative AI Fuzzer. */
export const GenerativeFuzzingOptionsSchema = z.object({
  /** The LLM provider to use (e.g. 'openai', 'anthropic'). */
  provider: z.string(),
  /** The base prompt to send to the LLM. */
  prompt: z.string().min(1),
  /** Optional model override. */
  model: z.string().optional(),
});
export type GenerativeFuzzingOptions = z.infer<typeof GenerativeFuzzingOptionsSchema>;

/** Options for constructing a RandomizationEngine. */
export const EngineOptionsSchema = z.object({
  /** Seed for the PRNG. Accepts a number or a string (hashed internally). Defaults to a timestamp-based value if not provided. */
  seed: z.union([z.number().int(), z.string()]).optional(),
});
export type EngineOptions = z.infer<typeof EngineOptionsSchema>;

/** The record type for a generated scenario payload. */
export type ScenarioRecord = Record<string, unknown>;

/** A provider function that accepts a prompt and returns a string asynchronously. */
export type LLMProviderFn = (prompt: string, model?: string) => Promise<string>;

/** Registry of named LLM providers. */
export type LLMProviderRegistry = Record<string, LLMProviderFn>;
