import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { RandomizationEngine } from '../src/engine/RandomizationEngine.js';

describe('RandomizationEngine', () => {
  it('can be constructed with a seed', () => {
    const engine = new RandomizationEngine({ seed: 12345 });
    expect(engine).toBeInstanceOf(RandomizationEngine);
  });

  it('accepts a string seed', () => {
    const engine = new RandomizationEngine({ seed: 'my-scenario' });
    expect(engine).toBeInstanceOf(RandomizationEngine);
  });

  it('is deterministic with a string seed', async () => {
    const e1 = new RandomizationEngine({ seed: 'test-scenario' });
    const e2 = new RandomizationEngine({ seed: 'test-scenario' });
    e1.applyGaussianNoise('gravity', { mean: 9.8, stdDev: 0.5 });
    e2.applyGaussianNoise('gravity', { mean: 9.8, stdDev: 0.5 });
    const s1 = await e1.generate();
    const s2 = await e2.generate();
    expect(s1.gravity).toBe(s2.gravity);
  });

  it('uses a default seed when none is provided', () => {
    const engine = new RandomizationEngine();
    expect(engine).toBeInstanceOf(RandomizationEngine);
  });

  it('generates Gaussian noise deterministically', async () => {
    const e1 = new RandomizationEngine({ seed: 1 });
    const e2 = new RandomizationEngine({ seed: 1 });

    e1.applyGaussianNoise('gravity', { mean: 9.8, stdDev: 0.5 });
    e2.applyGaussianNoise('gravity', { mean: 9.8, stdDev: 0.5 });

    const s1 = await e1.generate();
    const s2 = await e2.generate();
    expect(s1.gravity).toBe(s2.gravity);
  });

  it('generates uniform values deterministically', async () => {
    const e1 = new RandomizationEngine({ seed: 7 });
    const e2 = new RandomizationEngine({ seed: 7 });

    e1.applyUniform('speed', { min: 0, max: 100 });
    e2.applyUniform('speed', { min: 0, max: 100 });

    const s1 = await e1.generate();
    const s2 = await e2.generate();
    expect(s1.speed).toBe(s2.speed);
  });

  it('generates Poisson values deterministically', async () => {
    const e1 = new RandomizationEngine({ seed: 11 });
    const e2 = new RandomizationEngine({ seed: 11 });

    e1.applyPoisson('events', { lambda: 3 });
    e2.applyPoisson('events', { lambda: 3 });

    const s1 = await e1.generate();
    const s2 = await e2.generate();
    expect(s1.events).toBe(s2.events);
    expect(Number.isInteger(s1.events as number)).toBe(true);
  });

  it('generates categorical values deterministically', async () => {
    const e1 = new RandomizationEngine({ seed: 99 });
    const e2 = new RandomizationEngine({ seed: 99 });

    e1.applyWeightedCategorical('weather', { rain: 0.7, sunny: 0.3 });
    e2.applyWeightedCategorical('weather', { rain: 0.7, sunny: 0.3 });

    const s1 = await e1.generate();
    const s2 = await e2.generate();
    expect(s1.weather).toBe(s2.weather);
    expect(['rain', 'sunny']).toContain(s1.weather);
  });

  it('supports a fluent / chainable API', async () => {
    const scenario = await new RandomizationEngine({ seed: 42 })
      .applyGaussianNoise('gravity', { mean: 9.8, stdDev: 0.1 })
      .applyWeightedCategorical('weather', { rain: 0.6, sunny: 0.4 })
      .applyUniform('temperature', { min: -10, max: 40 })
      .applyPoisson('failures', { lambda: 2 })
      .generate();

    expect(typeof scenario.gravity).toBe('number');
    expect(['rain', 'sunny']).toContain(scenario.weather);
    expect(typeof scenario.temperature).toBe('number');
    expect(typeof scenario.failures).toBe('number');
  });

  it('validates output against a Zod schema', async () => {
    const WorldSchema = z.object({
      gravity: z.number(),
      weather: z.enum(['rain', 'sunny']),
    });

    const scenario = await new RandomizationEngine({ seed: 55 })
      .schema(WorldSchema)
      .applyGaussianNoise('gravity', { mean: 9.8, stdDev: 0.1 })
      .applyWeightedCategorical('weather', { rain: 0.5, sunny: 0.5 })
      .generate();

    expect(typeof scenario.gravity).toBe('number');
    expect(['rain', 'sunny']).toContain(scenario.weather);
  });

  it('throws a Zod error when schema validation fails', async () => {
    const StrictSchema = z.object({
      value: z.string(), // engine will produce a number, so this should fail
    });

    const engine = new RandomizationEngine({ seed: 1 })
      .schema(StrictSchema)
      .applyGaussianNoise('value', { mean: 0, stdDev: 1 });

    await expect(engine.generate()).rejects.toThrow();
  });

  it('supports generative fuzzing via a registered provider', async () => {
    const mockLLM = vi.fn().mockResolvedValue('A stressed merchant');

    const scenario = await new RandomizationEngine({ seed: 10 })
      .registerProvider('mock', mockLLM)
      .applyGenerativeFuzzing('npc_personality', {
        provider: 'mock',
        prompt: 'Generate a highly stressed merchant',
      })
      .generate();

    expect(scenario.npc_personality).toBe('A stressed merchant');
    expect(mockLLM).toHaveBeenCalledWith('Generate a highly stressed merchant', undefined);
  });

  it('combines multiple field types in a single scenario', async () => {
    const mockLLM = vi.fn().mockResolvedValue('narrative text');

    const scenario = await new RandomizationEngine({ seed: 42 })
      .registerProvider('mock', mockLLM)
      .applyGaussianNoise('gravity', { mean: 9.8, stdDev: 0.5 })
      .applyWeightedCategorical('weather', { rain: 0.7, sunny: 0.3 })
      .applyGenerativeFuzzing('npc_personality', {
        provider: 'mock',
        prompt: 'Generate a highly stressed merchant',
      })
      .generate();

    expect(typeof scenario.gravity).toBe('number');
    expect(['rain', 'sunny']).toContain(scenario.weather);
    expect(scenario.npc_personality).toBe('narrative text');
  });
});
