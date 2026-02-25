import { z, ZodSchema } from 'zod';
import { SeededPRNG } from '../prng/SeededPRNG.js';
import { StatisticalSpoofer } from '../spoofers/StatisticalSpoofer.js';
import { CategoricalSpoofer } from '../spoofers/CategoricalSpoofer.js';
import { GenerativeFuzzer } from '../fuzzer/GenerativeFuzzer.js';
import {
  EngineOptions,
  EngineOptionsSchema,
  GaussianOptions,
  UniformOptions,
  PoissonOptions,
  WeightedCategorical,
  GenerativeFuzzingOptions,
  LLMProviderFn,
  ScenarioRecord,
} from '../types/index.js';

type OperationType = 'gaussian' | 'uniform' | 'poisson' | 'categorical' | 'generative';

interface BaseOperation {
  type: OperationType;
  field: string;
}

interface GaussianOperation extends BaseOperation {
  type: 'gaussian';
  options: GaussianOptions;
}

interface UniformOperation extends BaseOperation {
  type: 'uniform';
  options: UniformOptions;
}

interface PoissonOperation extends BaseOperation {
  type: 'poisson';
  options: PoissonOptions;
}

interface CategoricalOperation extends BaseOperation {
  type: 'categorical';
  weights: WeightedCategorical;
}

interface GenerativeOperation extends BaseOperation {
  type: 'generative';
  options: GenerativeFuzzingOptions;
}

type Operation =
  | GaussianOperation
  | UniformOperation
  | PoissonOperation
  | CategoricalOperation
  | GenerativeOperation;

/**
 * RandomizationEngine is the primary entry point for domain-forge.
 *
 * It provides a chainable API for building deterministic, schema-validated
 * scenario payloads enriched with statistical noise, categorical sampling,
 * and generative AI fuzzing.
 *
 * @example
 * ```ts
 * const engine = new RandomizationEngine({ seed: 12345 });
 *
 * const scenario = await engine
 *   .schema(WorldSchema)
 *   .applyGaussianNoise('gravity', { mean: 9.8, stdDev: 0.5 })
 *   .applyWeightedCategorical('weather', { rain: 0.7, sunny: 0.3 })
 *   .applyGenerativeFuzzing('npc_personality', {
 *     provider: 'openai',
 *     prompt: 'Generate a highly stressed merchant',
 *   })
 *   .generate();
 * ```
 */
export class RandomizationEngine {
  private readonly prng: SeededPRNG;
  private readonly fuzzer: GenerativeFuzzer;
  private readonly operations: Operation[];
  private zodSchema: ZodSchema | null;

  /**
   * Creates a new RandomizationEngine.
   * @param options - Engine configuration, including an optional PRNG seed.
   */
  constructor(options: EngineOptions = {}) {
    const validated = EngineOptionsSchema.parse(options);
    const seed = validated.seed ?? Date.now();
    this.prng = new SeededPRNG(seed);
    this.fuzzer = new GenerativeFuzzer();
    this.operations = [];
    this.zodSchema = null;
  }

  /**
   * Attaches a Zod schema for validating the final generated scenario.
   * @param schema - A Zod schema to validate the output.
   * @returns `this` for chaining.
   */
  public schema<T>(schema: ZodSchema<T>): this {
    this.zodSchema = schema as ZodSchema;
    return this;
  }

  /**
   * Registers a named LLM provider for use with {@link applyGenerativeFuzzing}.
   * @param name - Provider identifier (e.g. 'openai').
   * @param fn - Async function accepting a prompt and returning generated text.
   * @returns `this` for chaining.
   */
  public registerProvider(name: string, fn: LLMProviderFn): this {
    this.fuzzer.registerProvider(name, fn);
    return this;
  }

  /**
   * Schedules a Gaussian noise operation for the specified field.
   * @param field - The output field name.
   * @param options - Gaussian distribution parameters.
   * @returns `this` for chaining.
   */
  public applyGaussianNoise(field: string, options: GaussianOptions): this {
    this.operations.push({ type: 'gaussian', field, options });
    return this;
  }

  /**
   * Schedules a Uniform distribution operation for the specified field.
   * @param field - The output field name.
   * @param options - Uniform distribution parameters.
   * @returns `this` for chaining.
   */
  public applyUniform(field: string, options: UniformOptions): this {
    this.operations.push({ type: 'uniform', field, options });
    return this;
  }

  /**
   * Schedules a Poisson distribution operation for the specified field.
   * @param field - The output field name.
   * @param options - Poisson distribution parameters.
   * @returns `this` for chaining.
   */
  public applyPoisson(field: string, options: PoissonOptions): this {
    this.operations.push({ type: 'poisson', field, options });
    return this;
  }

  /**
   * Schedules a weighted categorical sampling operation for the specified field.
   * @param field - The output field name.
   * @param weights - A map of category names to relative weights.
   * @returns `this` for chaining.
   */
  public applyWeightedCategorical(field: string, weights: WeightedCategorical): this {
    this.operations.push({ type: 'categorical', field, weights });
    return this;
  }

  /**
   * Schedules a generative AI fuzzing operation for the specified field.
   * @param field - The output field name.
   * @param options - Generative fuzzing options (provider, prompt, optional model).
   * @returns `this` for chaining.
   */
  public applyGenerativeFuzzing(field: string, options: GenerativeFuzzingOptions): this {
    this.operations.push({ type: 'generative', field, options });
    return this;
  }

  /**
   * Executes all scheduled operations and returns the generated scenario.
   *
   * If a Zod schema was provided via {@link schema}, the result is validated
   * against it before being returned.
   *
   * @returns A promise resolving to the generated scenario record.
   * @throws If schema validation fails.
   */
  public async generate(): Promise<ScenarioRecord> {
    const result: ScenarioRecord = {};

    for (const op of this.operations) {
      switch (op.type) {
        case 'gaussian':
          result[op.field] = StatisticalSpoofer.gaussian(this.prng, op.options);
          break;
        case 'uniform':
          result[op.field] = StatisticalSpoofer.uniform(this.prng, op.options);
          break;
        case 'poisson':
          result[op.field] = StatisticalSpoofer.poisson(this.prng, op.options);
          break;
        case 'categorical':
          result[op.field] = CategoricalSpoofer.sample(this.prng, op.weights);
          break;
        case 'generative':
          result[op.field] = await this.fuzzer.fuzz(op.options);
          break;
      }
    }

    if (this.zodSchema) {
      return this.zodSchema.parse(result) as ScenarioRecord;
    }

    return result;
  }
}
