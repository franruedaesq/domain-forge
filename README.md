# domain-forge

> A deterministic, highly extensible TypeScript library for **Domain Randomization**, **Data Spoofing**, and **Scenario Fuzzing**.

[![npm](https://img.shields.io/npm/v/domain-forge)](https://www.npmjs.com/package/domain-forge)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)

---

## What We're Building

**domain-forge** empowers engineers to stress-test simulations, train Machine Learning models, and torture-test LLM agents by automatically generating millions of chaotic, mathematically varied, and generatively diverse virtual environments.

It bridges traditional statistical randomization (uniform, Gaussian, Poisson distributions) with Generative AI (LLM-based fuzzing for complex narrative or semantic states), all under a single, type-safe, chainable API.

### Target Audience

- 🤖 **ML Engineers** — generate diverse, reproducible training environments
- 🎮 **Simulation Developers** — inject controlled chaos into physics and world models
- 🧠 **AI Agent Architects** — torture-test LLM agents with edge-case scenarios

---

## Features

| Feature | Description |
|---|---|
| 🎲 **Deterministic PRNG** | Mulberry32 seedable PRNG — accepts numeric or string seeds, fully reproducible |
| 📊 **Statistical Spoofer** | Gaussian, Uniform, and Poisson distribution noise for numeric fields |
| 🏷️ **Categorical Spoofer** | Weighted random selection of discrete states |
| 🤖 **Generative AI Fuzzer** | Async LLM-powered semantic fuzzing via plug-and-play provider registry |
| ✅ **Schema Validation** | Zod-based runtime type validation of generated scenarios |
| 🔗 **Chainable API** | Fluent builder pattern — compose complex scenarios in a single expression |

---

## Installation

```bash
npm install domain-forge
```

---

## Quick Start

```ts
import { RandomizationEngine } from 'domain-forge';

const scenario = await new RandomizationEngine({ seed: 'my-reproducible-run' })
  .applyGaussianNoise('gravity', { mean: 9.8, stdDev: 0.5 })
  .applyUniform('wind_speed', { min: 0, max: 30 })
  .applyPoisson('failure_count', { lambda: 2 })
  .applyWeightedCategorical('weather', { rain: 0.7, sunny: 0.2, fog: 0.1 })
  .generate();

console.log(scenario);
// {
//   gravity: 9.412...,
//   wind_speed: 17.83...,
//   failure_count: 1,
//   weather: 'rain'
// }
```

### With Zod Schema Validation

```ts
import { RandomizationEngine } from 'domain-forge';
import { z } from 'zod';

const WorldSchema = z.object({
  gravity: z.number(),
  weather: z.enum(['rain', 'sunny', 'fog']),
});

const scenario = await new RandomizationEngine({ seed: 42 })
  .schema(WorldSchema)
  .applyGaussianNoise('gravity', { mean: 9.8, stdDev: 0.1 })
  .applyWeightedCategorical('weather', { rain: 0.7, sunny: 0.2, fog: 0.1 })
  .generate();
```

### With Generative AI Fuzzing

```ts
import { RandomizationEngine } from 'domain-forge';

const scenario = await new RandomizationEngine({ seed: 99 })
  .registerProvider('openai', async (prompt, model) => {
    const res = await openai.chat.completions.create({
      model: model ?? 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
    });
    return res.choices[0].message.content ?? '';
  })
  .applyGaussianNoise('gravity', { mean: 9.8, stdDev: 0.5 })
  .applyGenerativeFuzzing('npc_personality', {
    provider: 'openai',
    prompt: 'Generate a panicked merchant personality profile in 2 sentences.',
  })
  .generate();
```

---

## Architecture & DX Strategy

To ensure reliability and excellent Developer Experience, the architecture is split into three core layers:

### 1. The Core Engine (Synchronous)

A deterministic **Pseudo-Random Number Generator (PRNG)** state machine built on the **Mulberry32** algorithm. It accepts numeric or string seeds (strings are hashed via djb2 to a 32-bit integer), guaranteeing that any seed value — whether `42` or `"my-scenario-name"` — produces the exact same sequence every time.

The `RandomizationEngine` parses a randomization schema and spits out randomized payloads using pluggable spoofers:

- **`StatisticalSpoofer`** — Gaussian (Box-Muller), Uniform, and Poisson distributions
- **`CategoricalSpoofer`** — weighted sampling over discrete category maps

### 2. The Fuzzer Bridge (Asynchronous)

An interface layer that connects to external LLMs via a **plug-and-play provider registry**. It takes the output of the Core Engine and enriches it with generative semantic data (e.g., personality descriptions, narrative events, economic conditions).

Providers are registered by name and resolved at `generate()` time:

```ts
engine.registerProvider('anthropic', async (prompt) => { /* ... */ });
```

### 3. The Schema Validators

**Zod** integrations that ensure the generated chaotic outputs still conform to the required types of the target simulation. Attach a schema via `.schema(ZodSchema)` and the engine validates the final payload before returning it — throwing a descriptive `ZodError` if the output is invalid.

---

## API Reference

### `new RandomizationEngine(options?)`

| Option | Type | Default | Description |
|---|---|---|---|
| `seed` | `number \| string` | `Date.now()` | Seed for the PRNG. Identical seeds guarantee identical output. |

### `.applyGaussianNoise(field, { mean, stdDev })`
Samples from a Gaussian distribution N(mean, stdDev²).

### `.applyUniform(field, { min, max })`
Samples uniformly from the interval `[min, max)`.

### `.applyPoisson(field, { lambda })`
Samples a Poisson-distributed integer with the given rate `lambda`.

### `.applyWeightedCategorical(field, weights)`
Selects a key from `weights` proportionally. Weights are automatically normalized.

### `.applyGenerativeFuzzing(field, { provider, prompt, model? })`
Calls the registered LLM provider asynchronously and stores the result.

### `.registerProvider(name, fn)`
Registers an async `(prompt, model?) => Promise<string>` function.

### `.schema(zodSchema)`
Attaches a Zod schema; the final result is parsed and validated before returning.

### `.generate() → Promise<ScenarioRecord>`
Executes all queued operations and returns the scenario payload.

---

## Standalone Utilities

```ts
import { SeededPRNG, StatisticalSpoofer, CategoricalSpoofer, GenerativeFuzzer } from 'domain-forge';

// Use the PRNG directly
const prng = new SeededPRNG('my-seed');
prng.next();       // float in [0, 1)
prng.nextInt(1, 6); // integer in [1, 6]
prng.reseed('new-seed');

// Use spoofers independently
StatisticalSpoofer.gaussian(prng, { mean: 0, stdDev: 1 });
StatisticalSpoofer.uniform(prng, { min: -10, max: 10 });
StatisticalSpoofer.poisson(prng, { lambda: 5 });
CategoricalSpoofer.sample(prng, { a: 1, b: 2, c: 7 });
```

---

## Development

```bash
npm install        # install dependencies
npm test           # run test suite (vitest)
npm run build      # compile with tsup
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run format     # prettier
```

---

## License

ISC
