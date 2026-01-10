// =============================================================================
// Confidence Thresholds
// =============================================================================
// These determine how the system handles items at different confidence levels.

export interface ThresholdConfig {
  /** Items above this threshold are filed directly without review */
  filed: number;
  /** Items between clarification and filed are flagged for review */
  flagged: number;
  /** Items below this threshold require clarification before processing */
  clarification: number;
}

export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  filed: 0.8, // High confidence - file directly
  flagged: 0.5, // Medium - file but flag for review
  clarification: 0.5, // Below this - ask for clarification
};

/**
 * Determine the action based on confidence score
 */
export function getConfidenceAction(
  score: number,
  thresholds: ThresholdConfig = DEFAULT_THRESHOLDS
): "file" | "flag" | "clarify" {
  if (score >= thresholds.filed) {
    return "file";
  }
  if (score >= thresholds.flagged) {
    return "flag";
  }
  return "clarify";
}
