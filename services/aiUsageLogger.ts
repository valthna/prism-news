import { supabase } from './supabaseClient';

type GeminiUsageMetadata = {
  promptTokenCount?: number;
  inputTokenCount?: number;
  candidatesTokenCount?: number;
  outputTokenCount?: number;
  totalTokenCount?: number;
  [key: string]: unknown;
};

type GeminiUsageLog = {
  model: string;
  operation: string;
  usageMetadata?: GeminiUsageMetadata | null;
  metadata?: Record<string, unknown>;
};

type ImagenUsageLog = {
  model: string;
  operation: string;
  metadata?: Record<string, unknown>;
  highResolution?: boolean;
};

type AiUsageRow = {
  service: string;
  model: string;
  operation: string;
  prompt_tokens?: number | null;
  response_tokens?: number | null;
  total_tokens?: number | null;
  input_cost_usd?: number | null;
  output_cost_usd?: number | null;
  total_cost_usd?: number | null;
  metadata?: Record<string, unknown> | null;
};

const truthyEnvValues = new Set(['1', 'true', 'yes', 'on']);
const loggingDisabled = truthyEnvValues.has(
  String(process.env.PRISM_DISABLE_AI_LOGS ?? '').toLowerCase()
);

const parseEnvNumber = (key: string, fallback: number): number => {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const sanitizeModelKey = (model: string): string =>
  model.replace(/[^a-z0-9]+/gi, '_').toUpperCase();

const applyModelOverride = (
  model: string,
  suffix: string,
  fallback: number
): number => {
  const key = `PRISM_PRICE_${sanitizeModelKey(model)}_${suffix}`;
  return parseEnvNumber(key, fallback);
};

const GEMINI_PRO_INPUT_PER_MTOK = parseEnvNumber(
  'PRISM_PRICE_GEMINI_PRO_INPUT_PER_MTOK',
  3.5
);
const GEMINI_PRO_OUTPUT_PER_MTOK = parseEnvNumber(
  'PRISM_PRICE_GEMINI_PRO_OUTPUT_PER_MTOK',
  10.5
);
const GEMINI_FLASH_INPUT_PER_MTOK = parseEnvNumber(
  'PRISM_PRICE_GEMINI_FLASH_INPUT_PER_MTOK',
  0.35
);
const GEMINI_FLASH_OUTPUT_PER_MTOK = parseEnvNumber(
  'PRISM_PRICE_GEMINI_FLASH_OUTPUT_PER_MTOK',
  1.05
);

const IMAGEN_PRO_PREVIEW_COST = parseEnvNumber(
  'PRISM_PRICE_GEMINI_3_PRO_IMAGE_PREVIEW_USD',
  0.06
);
const IMAGEN_FLASH_COST = parseEnvNumber(
  'PRISM_PRICE_GEMINI_2_5_FLASH_IMAGE_USD',
  0.012
);
const IMAGEN_HIGHRES_MULTIPLIER = parseEnvNumber(
  'PRISM_PRICE_GEMINI_IMAGE_HIGHRES_MULTIPLIER',
  1.4
);
const IMAGEN_FALLBACK_COST = parseEnvNumber(
  'PRISM_PRICE_GEMINI_IMAGE_FALLBACK_USD',
  0.02
);

const roundCurrency = (value: number): number =>
  Math.round(value * 1_000_000) / 1_000_000;

const getGeminiPricing = (model: string) => {
  const normalized = model.toLowerCase();
  const base = normalized.includes('flash')
    ? {
        inputPerMTok: GEMINI_FLASH_INPUT_PER_MTOK,
        outputPerMTok: GEMINI_FLASH_OUTPUT_PER_MTOK,
      }
    : {
        inputPerMTok: GEMINI_PRO_INPUT_PER_MTOK,
        outputPerMTok: GEMINI_PRO_OUTPUT_PER_MTOK,
      };

  return {
    inputPerMTok: applyModelOverride(model, 'INPUT_PER_MTOK', base.inputPerMTok),
    outputPerMTok: applyModelOverride(
      model,
      'OUTPUT_PER_MTOK',
      base.outputPerMTok
    ),
  };
};

const estimateImagenCost = (model: string, highResolution?: boolean): number => {
  const normalized = model.toLowerCase();
  let baseCost = IMAGEN_FALLBACK_COST;
  if (normalized.includes('pro-image')) {
    baseCost = IMAGEN_PRO_PREVIEW_COST;
  } else if (normalized.includes('flash-image')) {
    baseCost = IMAGEN_FLASH_COST;
  }
  const costWithOverrides = applyModelOverride(model, 'PER_IMAGE_USD', baseCost);
  const multiplier = highResolution ? IMAGEN_HIGHRES_MULTIPLIER : 1;
  return roundCurrency(costWithOverrides * multiplier);
};

const insertUsageRow = async (payload: AiUsageRow) => {
  if (loggingDisabled || !supabase) return;
  try {
    const { error } = await supabase
      .from('ai_usage_events')
      .insert(payload);
    if (error) {
      console.warn('[PRISM] Failed to record AI usage:', error.message || error);
    }
  } catch (error) {
    console.warn('[PRISM] AI usage logging aborted:', error);
  }
};

export const recordGeminiUsage = async ({
  model,
  operation,
  usageMetadata,
  metadata,
}: GeminiUsageLog) => {
  if (!model || loggingDisabled) return;

  const promptTokens =
    usageMetadata?.promptTokenCount ??
    usageMetadata?.inputTokenCount ??
    null;
  const responseTokens =
    usageMetadata?.candidatesTokenCount ??
    usageMetadata?.outputTokenCount ??
    null;
  const tokensComputedFromParts =
    (promptTokens ?? 0) + (responseTokens ?? 0);
  const totalTokens =
    usageMetadata?.totalTokenCount ??
    (promptTokens === null && responseTokens === null
      ? null
      : tokensComputedFromParts);

  const pricing = getGeminiPricing(model);
  const inputCost = promptTokens
    ? roundCurrency((promptTokens / 1_000_000) * pricing.inputPerMTok)
    : null;
  const outputCost = responseTokens
    ? roundCurrency((responseTokens / 1_000_000) * pricing.outputPerMTok)
    : null;
  const totalCost =
    inputCost !== null || outputCost !== null
      ? roundCurrency((inputCost ?? 0) + (outputCost ?? 0))
      : null;

  await insertUsageRow({
    service: 'gemini_llm',
    model,
    operation,
    prompt_tokens: promptTokens,
    response_tokens: responseTokens,
    total_tokens: totalTokens,
    input_cost_usd: inputCost,
    output_cost_usd: outputCost,
    total_cost_usd: totalCost,
    metadata: metadata ?? null,
  });
};

export const recordImagenUsage = async ({
  model,
  operation,
  metadata,
  highResolution,
}: ImagenUsageLog) => {
  if (!model || loggingDisabled) return;

  const totalCostUsd = estimateImagenCost(model, highResolution);
  await insertUsageRow({
    service: 'gemini_imagen',
    model,
    operation,
    total_cost_usd: totalCostUsd,
    metadata: metadata ?? null,
  });
};


