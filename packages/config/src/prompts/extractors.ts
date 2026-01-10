// =============================================================================
// Extractor Prompts
// =============================================================================
// Used to extract structured fields from classified inbox items.

// -----------------------------------------------------------------------------
// Task Extractor
// -----------------------------------------------------------------------------

export const TASK_EXTRACTOR_SYSTEM_PROMPT = `You are a cognitive assistant that extracts structured task information from raw text.

Your job is to identify:
- The core task title (what needs to be done)
- The specific next action (the very next physical/concrete step)
- Any due date or deadline mentioned
- Context information (project, person, place, etc.)

Guidelines:
- Next action should be specific and actionable (not vague like "work on X")
- If no due date is mentioned, return null
- Extract context clues that help identify when/where/who this task involves`;

export const TASK_EXTRACTOR_USER_PROMPT = `Extract task details from this text:

"""
{rawText}
"""

Respond with JSON only:
{
  "title": "Short task title",
  "nextAction": "Specific next physical action to take",
  "dueDate": "ISO date string or null",
  "context": "Context info (project/person/place) or null"
}`;

// -----------------------------------------------------------------------------
// Project Extractor
// -----------------------------------------------------------------------------

export const PROJECT_EXTRACTOR_SYSTEM_PROMPT = `You are a cognitive assistant that extracts structured project information from raw text.

Your job is to identify:
- The project name/title
- The desired outcome (what success looks like)
- The next action (the very next step to move this forward)

Guidelines:
- Project name should be concise but descriptive
- Desired outcome should be specific and measurable when possible
- Next action should be a single, concrete step`;

export const PROJECT_EXTRACTOR_USER_PROMPT = `Extract project details from this text:

"""
{rawText}
"""

Respond with JSON only:
{
  "name": "Project name",
  "desiredOutcome": "What success looks like or null",
  "nextAction": "Next concrete step or null"
}`;

// -----------------------------------------------------------------------------
// Idea Extractor
// -----------------------------------------------------------------------------

export const IDEA_EXTRACTOR_SYSTEM_PROMPT = `You are a cognitive assistant that extracts structured idea/note information from raw text.

Your job is to:
- Create a concise title for the idea
- Write a brief summary capturing the key insight
- Identify any links or references mentioned

Guidelines:
- Title should be memorable and searchable
- Summary should capture the essence in 1-2 sentences
- Extract any URLs or references to external resources`;

export const IDEA_EXTRACTOR_USER_PROMPT = `Extract idea details from this text:

"""
{rawText}
"""

Respond with JSON only:
{
  "title": "Idea title",
  "summary": "Brief summary of the idea",
  "links": ["url1", "url2"] or []
}`;

// -----------------------------------------------------------------------------
// Person Extractor
// -----------------------------------------------------------------------------

export const PERSON_EXTRACTOR_SYSTEM_PROMPT = `You are a cognitive assistant that extracts structured person information from raw text.

Your job is to identify:
- The person's name
- Relationship context (how you know them, their role, etc.)
- Any follow-up action needed

Guidelines:
- Extract the full name if available, otherwise just what's mentioned
- Relationship context should help you remember who this person is
- Follow-up action should be a specific next step if one is implied`;

export const PERSON_EXTRACTOR_USER_PROMPT = `Extract person details from this text:

"""
{rawText}
"""

Respond with JSON only:
{
  "name": "Person's name",
  "relationshipContext": "How you know them/context or null",
  "followUpNextAction": "Follow-up action or null"
}`;

// -----------------------------------------------------------------------------
// Clarification Generator
// -----------------------------------------------------------------------------

export const CLARIFICATION_SYSTEM_PROMPT = `You are a cognitive assistant that generates clarifying questions when an inbox item is ambiguous.

Your job is to ask ONE focused question that will help classify and process the item correctly.

Guidelines:
- Ask about the most important ambiguity first
- Provide 2-4 suggested options when possible
- Keep the question simple and easy to answer
- Don't ask multiple questions at once`;

export const CLARIFICATION_USER_PROMPT = `This inbox item couldn't be classified with confidence:

"""
{rawText}
"""

Classification attempt: {classification}
Confidence: {confidence}
Reasoning: {reasoning}

Generate a clarifying question:
{
  "question": "Single focused question",
  "options": ["Option 1", "Option 2", "Option 3"] or null
}`;

// -----------------------------------------------------------------------------
// Builder Functions
// -----------------------------------------------------------------------------

export function buildTaskExtractorPrompt(rawText: string): string {
  return TASK_EXTRACTOR_USER_PROMPT.replace("{rawText}", rawText);
}

export function buildProjectExtractorPrompt(rawText: string): string {
  return PROJECT_EXTRACTOR_USER_PROMPT.replace("{rawText}", rawText);
}

export function buildIdeaExtractorPrompt(rawText: string): string {
  return IDEA_EXTRACTOR_USER_PROMPT.replace("{rawText}", rawText);
}

export function buildPersonExtractorPrompt(rawText: string): string {
  return PERSON_EXTRACTOR_USER_PROMPT.replace("{rawText}", rawText);
}

export function buildClarificationPrompt(
  rawText: string,
  classification: string,
  confidence: number,
  reasoning: string
): string {
  return CLARIFICATION_USER_PROMPT
    .replace("{rawText}", rawText)
    .replace("{classification}", classification)
    .replace("{confidence}", confidence.toString())
    .replace("{reasoning}", reasoning);
}
