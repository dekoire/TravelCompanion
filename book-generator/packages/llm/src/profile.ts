import type { Capability, ModelBinding, ModelProfile } from './types';

/**
 * Beispiel-Modellprofil. Die Modell-IDs sind PLATZHALTER und muessen zur
 * Implementierungszeit gegen die Provider-Dokumentation geprueft werden
 * (Verfuegbarkeit von Structured Output, Context-Caching, Thinking-Budget,
 * maximalem Output). Die Architektur haengt an den Capabilities, nicht an den Namen.
 */
export const CAPABILITY_DEFAULTS: Record<Capability, Omit<ModelBinding, 'provider' | 'modelId' | 'capability'>> = {
  PLANNER:   { temperature: 0.9, maxOutputTokens:  8_000, thinkingBudget: 8_000, timeoutMs: 300_000 },
  DRAFTER:   { temperature: 0.85, maxOutputTokens: 16_000, thinkingBudget: 2_000, timeoutMs: 480_000 },
  EXTRACTOR: { temperature: 0.1, maxOutputTokens:  6_000, timeoutMs: 120_000 },
  VERIFIER:  { temperature: 0.0, maxOutputTokens:    600, timeoutMs:  60_000 },
  AUDITOR:   { temperature: 0.4, maxOutputTokens:  8_000, thinkingBudget: 12_000, timeoutMs: 540_000 },
  CRITIC:    { temperature: 0.3, maxOutputTokens:  3_000, timeoutMs: 150_000 },
  MODERATOR: { temperature: 0.0, maxOutputTokens:  1_000, timeoutMs:  60_000 },
  EMBED:     { temperature: 0.0, maxOutputTokens:      1, timeoutMs:  60_000 },
  IMAGE:     { temperature: 1.0, maxOutputTokens:      1, timeoutMs: 180_000 },
  TTS:       { temperature: 0.0, maxOutputTokens:      1, timeoutMs: 300_000 },
};

export function buildProfile(
  provider: string,
  modelIds: Partial<Record<Capability, string>>,
  overrides: Partial<Record<Capability, Partial<ModelBinding>>> = {},
): ModelProfile {
  const out: Record<string, ModelBinding> = {};
  for (const [cap, modelId] of Object.entries(modelIds) as Array<[Capability, string]>) {
    out[cap] = {
      capability: cap,
      provider,
      modelId,
      ...CAPABILITY_DEFAULTS[cap],
      ...(overrides[cap] ?? {}),
    };
  }
  return out as ModelProfile;
}

/** Vollstaendiges Mock-Profil fuer Tests und lokale Entwicklung. */
export function mockProfile(provider = 'mock'): ModelProfile {
  const caps = Object.keys(CAPABILITY_DEFAULTS) as Capability[];
  const ids = Object.fromEntries(caps.map((c) => [c, `mock-${c.toLowerCase()}`]));
  return buildProfile(provider, ids as Partial<Record<Capability, string>>);
}
