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
  ILLMProvider,
  LLMProviderFn,
  ScenarioRecord,
} from '../types/index.js';

/**
 * Sets a value at a dot-notation path within a nested object, creating
 * intermediate objects as needed.
 *
 * @param obj - The target object to mutate.
 * @param path - A dot-separated key path (e.g. `"environment.temperature"`).
 * @param value - The value to set at the specified path.
 */
function setAtPath(obj: ScenarioRecord, path: string, value: unknown): void {
  const parts = path.split('.');
  let current: ScenarioRecord = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]!;
    if (typeof current[part] !== 'object' || current[part] === null) {
      current[part] = {};
    }
    current = current[part] as ScenarioRecord;
  }
  current[parts[parts.length - 1]!] = value;
}

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
  private baseline: ScenarioRecord | null;

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
    this.baseline = null;
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
   * Sets a deeply nested JSON object as the baseline for generated scenarios.
   * The baseline is deep-cloned during {@link generate} so the original is
   * never mutated. Randomization operations are applied on top of the clone.
   *
   * @param obj - A JSON-compatible nested object to use as the starting state.
   * @returns `this` for chaining.
   */
  public setBaseline(obj: ScenarioRecord): this {
    this.baseline = obj;
    return this;
  }

  /**
   * Registers a named LLM provider for use with {@link applyGenerativeFuzzing}.
   *
   * Accepts either a plain async function or an object implementing
   * {@link ILLMProvider}, keeping the library dependency-free of specific SDKs.
   *
   * @param name - Provider identifier (e.g. 'openai').
   * @param provider - Async function or {@link ILLMProvider} object.
   * @returns `this` for chaining.
   */
  public registerProvider(name: string, provider: LLMProviderFn | ILLMProvider): this {
    this.fuzzer.registerProvider(name, provider);
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
    const result: ScenarioRecord = this.baseline
      ? (JSON.parse(JSON.stringify(this.baseline)) as ScenarioRecord)
      : {};

    for (const op of this.operations) {
      switch (op.type) {
        case 'gaussian':
          setAtPath(result, op.field, StatisticalSpoofer.gaussian(this.prng, op.options));
          break;
        case 'uniform':
          setAtPath(result, op.field, StatisticalSpoofer.uniform(this.prng, op.options));
          break;
        case 'poisson':
          setAtPath(result, op.field, StatisticalSpoofer.poisson(this.prng, op.options));
          break;
        case 'categorical':
          setAtPath(result, op.field, CategoricalSpoofer.sample(this.prng, op.weights));
          break;
        case 'generative':
          setAtPath(result, op.field, await this.fuzzer.fuzz(op.options));
          break;
      }
    }

    if (this.zodSchema) {
      return this.zodSchema.parse(result) as ScenarioRecord;
    }

    return result;
  }
}
