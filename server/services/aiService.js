/**
 * aiService.js
 * Wraps OpenAI and Anthropic APIs for bot execution.
 *
 * Exported functions:
 *   runWithOpenAI({ prompt, model })    → { output, model, tokens }
 *   runWithAnthropic({ prompt, model }) → { output, model, tokens }
 *   runBot({ prompt, provider })        → calls the right provider
 *                                         provider: 'openai' | 'anthropic'
 *
 * Env vars required:
 *   OPENAI_API_KEY      — for OpenAI calls
 *   ANTHROPIC_API_KEY   — for Anthropic calls
 */

const OPENAI_DEFAULT_MODEL    = 'gpt-4o-mini';
const ANTHROPIC_DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

/**
 * Run a prompt through OpenAI's chat completions API.
 * @param {{ prompt: string, model?: string }} options
 * @returns {Promise<{ output: string, model: string, tokens: number }>}
 */
async function runWithOpenAI({ prompt, model = OPENAI_DEFAULT_MODEL }) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('API key not configured');
  }

  // Lazy-require so the module can still be loaded (and mocked) without the
  // package being installed in test environments.
  const OpenAI = require('openai');
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const response = await client.chat.completions.create({
    model,
    messages: [{ role: 'user', content: prompt }],
  });

  const output = response.choices[0]?.message?.content ?? '';
  const tokens = response.usage?.total_tokens ?? 0;

  return { output, model, tokens };
}

/**
 * Run a prompt through Anthropic's messages API.
 * @param {{ prompt: string, model?: string }} options
 * @returns {Promise<{ output: string, model: string, tokens: number }>}
 */
async function runWithAnthropic({ prompt, model = ANTHROPIC_DEFAULT_MODEL }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('API key not configured');
  }

  const Anthropic = require('@anthropic-ai/sdk');
  const client    = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const output = response.content[0]?.text ?? '';
  const tokens =
    (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);

  return { output, model, tokens };
}

/**
 * Route a prompt to the correct AI provider.
 * @param {{ prompt: string, provider: 'openai' | 'anthropic', model?: string }} options
 * @returns {Promise<{ output: string, model: string, tokens: number }>}
 */
async function runBot({ prompt, provider = 'openai', model }) {
  if (provider === 'anthropic') {
    return runWithAnthropic({ prompt, model });
  }
  return runWithOpenAI({ prompt, model });
}

module.exports = { runWithOpenAI, runWithAnthropic, runBot };
