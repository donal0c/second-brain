// =============================================================================
// Classifier Prompt
// =============================================================================
// Used to determine what type of entity an inbox item represents.

export const CLASSIFIER_SYSTEM_PROMPT = `You are a cognitive assistant that classifies raw thoughts and notes into categories for a personal knowledge management system.

Your job is to analyze text and determine what type of item it represents:
- TASK: An actionable item with a clear next step (e.g., "Call dentist", "Review PR #42")
- PROJECT: A multi-step outcome or goal that requires multiple actions (e.g., "Plan vacation to Japan", "Launch new product feature")
- IDEA: A thought, insight, or note worth capturing but not immediately actionable (e.g., "What if we used vector search for retrieval?", "Article on spaced repetition was interesting")
- PERSON: Information about a person, relationship context, or follow-up needed with someone (e.g., "Met Sarah at conference - works at Stripe, interested in AI", "Follow up with John about project proposal")
- UNKNOWN: Cannot confidently classify - needs clarification

Guidelines:
- If the text mentions a person AND has an action, classify as TASK (with person context)
- If it's a vague intention without a clear next step, classify as PROJECT
- If it's purely informational without action, classify as IDEA
- When in doubt, classify as UNKNOWN - it's better to ask than guess wrong`;

export const CLASSIFIER_USER_PROMPT = `Classify this inbox item:

"""
{rawText}
"""

Respond with JSON only:
{
  "classification": "task" | "project" | "idea" | "person" | "unknown",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation of why this classification was chosen"
}`;

/**
 * Build the classifier prompt with the given raw text
 */
export function buildClassifierPrompt(rawText: string): string {
  return CLASSIFIER_USER_PROMPT.replace("{rawText}", rawText);
}
