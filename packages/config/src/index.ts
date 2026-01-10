// @second-brain/config
// Taxonomy, thresholds, and prompt templates

// Taxonomy configuration
export * from "./taxonomy.js";

// Confidence thresholds
export * from "./thresholds.js";

// Prompt templates
export * from "./prompts/index.js";

// =============================================================================
// Combined Config Type
// =============================================================================

import type { TaxonomyConfig } from "./taxonomy.js";
import type { ThresholdConfig } from "./thresholds.js";
import { DEFAULT_TAXONOMY } from "./taxonomy.js";
import { DEFAULT_THRESHOLDS } from "./thresholds.js";

export interface SecondBrainConfig {
  taxonomy: TaxonomyConfig;
  thresholds: ThresholdConfig;
}

export const DEFAULT_CONFIG: SecondBrainConfig = {
  taxonomy: DEFAULT_TAXONOMY,
  thresholds: DEFAULT_THRESHOLDS,
};

/**
 * Create a config with custom overrides
 */
export function createConfig(
  overrides: Partial<SecondBrainConfig> = {}
): SecondBrainConfig {
  return {
    taxonomy: overrides.taxonomy ?? DEFAULT_TAXONOMY,
    thresholds: overrides.thresholds ?? DEFAULT_THRESHOLDS,
  };
}
